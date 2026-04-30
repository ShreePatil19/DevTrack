# DevTrack — Agentic Job Intelligence API

> A production-grade Node.js/Express REST API with a Python LangGraph agent microservice that turns a job application record into structured intelligence: gap analysis, talking points, and an inspectable execution trace. Built on a $0 stack — Groq (free LLM tier) + Neon (free Postgres) + Upstash (free Redis) + Render (free hosting).

[![CI](https://github.com/ShreePatil19/DevTrack/actions/workflows/deploy.yml/badge.svg)](https://github.com/ShreePatil19/DevTrack/actions)

---

## What this is

DevTrack is a job-application tracking API that I'm using during my own job search. The interesting bit is the `agents/` microservice: a LangGraph 4-node StateGraph that runs every time you analyze an application, with a real circuit breaker, normalized token-usage tracking across multiple LLM providers, and an inspectable per-run execution trace.

It's deliberately built to be cold-explainable in 10 minutes, with one agent that works flawlessly rather than three that look impressive in a feature list.

## Architecture

```
┌─────────────────────┐         ┌──────────────────────────┐
│  Node.js + Express  │  HTTP   │  Python FastAPI          │
│  Auth, Apps CRUD    │────────▶│  LangGraph agents        │
│  PostgreSQL + Redis │         │  Groq / Gemini / Ollama  │
│  Joi validation     │◀────────│  /agents/analyze         │
│  Rate limit 20/hr   │         │  /agents/runs/{id}       │
└─────────────────────┘         └──────────────────────────┘
        │                                  │
        ▼                                  ▼
   PostgreSQL                       In-memory run store
   (Neon free)                      (Redis-ready for prod)
        │
        ▼
   Redis (Upstash free)
```

### The LangGraph workflow

```
        ┌─────────────────┐
        │  fetch_profile  │  Synthesizes candidate context from application record
        └────────┬────────┘
                 ▼
    ┌──────────────────────────┐
    │  fetch_job_description   │  LLM call — synthesizes JD from URL/title/company
    └────────────┬─────────────┘
                 ▼
        ┌─────────────────┐
        │  gap_analysis   │  ◀──── CIRCUIT BREAKER
        └────────┬────────┘       Retries up to 2× on unparseable JSON
                 │                Routes to handle_error after exhaustion
        ┌────────┴────────┐
        ▼                 ▼
 ┌──────────────┐  ┌────────────────┐
 │ talking_     │  │ handle_error   │
 │ points       │  │ (final state   │
 │ (LLM call)   │  │  with error)   │
 └──────┬───────┘  └────────┬───────┘
        ▼                   ▼
       END                 END
```

## Why this design (cold-explanation)

The three things hiring panels actually probe:

1. **Failure modes** — `gap_analysis` has an explicit retry ceiling. If the LLM returns unparseable output twice, the conditional edge routes to `handle_error` which sets `circuit_breaker_triggered: true` in the response. No silent failures.
2. **Cost awareness** — Every node accumulates `token_usage` into the state. The final response includes `execution_metadata.token_cost_usd`. Provider-agnostic — usage is normalized across Groq's `prompt_tokens`, Gemini's `usage_metadata`, and Ollama's `eval_count`.
3. **Cold explainability** — `GET /api/agents/runs/{run_id}` returns the full state transition trace: every node, every input snapshot, every output, every duration. Inspectable agent reasoning.

## What this does not have (and why)

- **No CrewAI alongside LangGraph.** Picking both signals tutorial-following without architectural reasoning. LangGraph alone is the defensible choice — lower-level, more production-realistic, the explicit state graph is a visual artifact.
- **No vector DB / RAG.** Adds complexity without changing the agent's core capability. Phase 2.
- **No "Ollama as fallback" toggle.** Real systems don't need a switch to a worse LLM. Ollama is one of three first-class providers — equal status with Groq and Gemini.

---

## Quick start (Docker — fastest)

```bash
git clone https://github.com/ShreePatil19/DevTrack.git
cd DevTrack

# 1. Get a free Groq key from console.groq.com (no credit card)
echo "LLM_PROVIDER=groq" > agents/.env
echo "GROQ_API_KEY=gsk_..." >> agents/.env

# 2. Set up the root .env from the template
cp .env.example .env
# Edit JWT_SECRET to anything random

# 3. Up the stack
docker compose up --build
```

Open `http://localhost:3000/api-docs` for the Swagger UI. Open `http://localhost:8000/docs` for the agent service docs.

## Quick start (local, no Docker)

```bash
# Terminal 1 — Node API
npm install
# Make sure local Postgres + Redis are running, or use Neon + Upstash
npm run dev

# Terminal 2 — Python agents
cd agents
python -m venv .venv && source .venv/bin/activate    # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 90-second demo recipe

```bash
# 1. Register + login (5 sec)
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}' | jq -r .token)

# 2. Add an application (5 sec)
APP_ID=$(curl -s -X POST http://localhost:3000/api/applications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Atlassian",
    "position_title": "AI Engineer",
    "job_url": "https://atlassian.com/jobs",
    "notes": "Applied via LinkedIn referral"
  }' | jq -r .application.id)

# 3. Run the agent (~10 sec on Groq)
RUN=$(curl -s -X POST http://localhost:3000/api/agents/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"application_id\": \"$APP_ID\"}")

echo "$RUN" | jq

# 4. Inspect the agent's reasoning trace (5 sec)
RUN_ID=$(echo "$RUN" | jq -r .execution_metadata.run_id)
curl -s http://localhost:3000/api/agents/runs/$RUN_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

The trace shows every node's input snapshot, output snapshot, and duration. That's the demo.

---

## Failure modes and what I learned

> *Adding this section is more valuable than adding a third agent.* — LLM Council, peer review.

### 1. JSON-mode is a lie

Early `gap_analysis` prompts asked Claude/Groq for "valid JSON." About 1 in 8 responses came back wrapped in markdown code fences (`` ```json ... ``` ``). The graph crashed.

**Fix:** Strip markdown fences in the parser before `json.loads`. Then add an `assert` on the expected keys — if the LLM returns valid JSON with the wrong shape (`{"score": "high"}` instead of `{"fit_score": "High"}`) you still want the circuit breaker to fire.

```python
raw = response.content.strip()
if raw.startswith("```"):
    raw = raw.split("```")[1]
    if raw.startswith("json"):
        raw = raw[4:]
parsed = json.loads(raw)
assert parsed.get("fit_score") in ("Low", "Medium", "High")  # shape validation
```

### 2. `langgraph.invoke()` is synchronous and will block FastAPI's event loop

If you `await graph.invoke(...)` directly inside an `async def` route, every concurrent request blocks. For a 10-second LangGraph run, that means the second request waits 10 seconds before its profile fetch starts.

**Fix:** wrap with `asyncio.to_thread`. The graph runs on a thread-pool worker, the event loop stays responsive.

```python
async def run_job_intelligence(request_data: dict) -> dict:
    # ...
    final_state = await asyncio.to_thread(_invoke_graph, initial_state)
```

### 3. Token usage shapes differ across providers

Groq returns `response_metadata.token_usage.prompt_tokens`. Gemini uses `usage_metadata.input_tokens`. Ollama uses top-level `prompt_eval_count`.

**Fix:** a single `_accumulate_usage` function that probes all three shapes. The graph code stays provider-agnostic.

### 4. Compile the graph once, not per request

The first version called `StateGraph(...).compile()` inside the request handler. Each request paid a 50-300ms compile cost.

**Fix:** module-level compiled graph. One instance per Uvicorn worker.

```python
# Module level
_graph = _build_graph()

def _invoke_graph(initial_state): return _graph.invoke(initial_state)
```

---

## API surface

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Returns JWT |
| GET  | `/api/auth/me` | JWT | Current user |
| GET  | `/api/applications` | JWT | List user's applications |
| POST | `/api/applications` | JWT | Create application (Joi-validated) |
| PUT  | `/api/applications/:id` | JWT | Update (Joi-validated) |
| DELETE | `/api/applications/:id` | JWT | Delete |
| **POST** | **`/api/agents/analyze`** | **JWT** | **Run the LangGraph workflow on an application** |
| **GET** | **`/api/agents/runs/:run_id`** | **JWT** | **Inspect full execution trace** |

Agent endpoints have a tighter rate limit: 20 req/hour per user (LLM calls are expensive even when free).

Full Swagger UI: `http://localhost:3000/api-docs`

## LLM provider switching — one env var

```bash
# Default (free, fast, no credit card)
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# Or swap to Gemini (free tier)
LLM_PROVIDER=gemini
GOOGLE_API_KEY=...
GEMINI_MODEL=gemini-1.5-flash

# Or fully local
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

## Free deployment

| Component | Service | Free tier |
|-----------|---------|-----------|
| LLM | [Groq](https://console.groq.com) | Llama 3.3 70B, no credit card |
| PostgreSQL | [Neon.tech](https://neon.tech) | 0.5 GB |
| Redis | [Upstash](https://upstash.com) | 10K cmds/day |
| Hosting | [Render.com](https://render.com) | 750 hrs/mo |
| CI | GitHub Actions | Free for public repos |

See `DEPLOY.md` for step-by-step.

## Tech

**Node.js API:** Express 5 · PostgreSQL (`pg`) · Redis · JWT · bcryptjs · Joi · Helmet · CORS · express-rate-limit · Winston · Swagger

**Python agents:** FastAPI · LangGraph · LangChain · Pydantic · Uvicorn · pytest

**Infra:** Docker · docker-compose · GitHub Actions

## Tests

```bash
# Node.js
npm test

# Python (mocked LLM — no real API calls)
cd agents && pytest tests/ -v
```

## License

MIT
