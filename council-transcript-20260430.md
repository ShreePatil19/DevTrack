# LLM Council Transcript — DevTrack Agent Architecture
**Date:** 2026-04-30  
**Question:** What agent capabilities, architectural patterns, and design decisions maximize hiring signal per hour of effort for a Master of AI student building DevTrack as a resume project targeting AI Engineer / ML Engineer / ML Ops roles in Sydney, 2025-2026?

---

## Framed Question

A Master of AI student (UTS Sydney, 2026-2028) with 1 AI internship (Fishburners, building agentic content pipelines with Claude Haiku) is building a portfolio project for AI Engineer / ML Engineer / ML Ops roles in Sydney, Australia. Needs employer visa sponsorship (482 TSS), so targeting mid-to-large companies with structured engineering orgs. The project: DevTrack — a Node.js/Express job-application tracking API (JWT auth, PostgreSQL, Redis caching, Swagger docs, tests already built). Wants to add a Python FastAPI microservice with LangGraph + CrewAI agents and a React dashboard.

---

## Advisor Responses

### The Contrarian
The fatal flaw nobody is saying: this project is a job tracker that tracks job applications. You are the target user. Recruiters will see a productivity app with an AI wrapper — not an AI Engineer signal.

CrewAI + LangGraph together is a red flag. They solve overlapping problems with different abstractions. Using both signals you followed tutorials without understanding the design tradeoffs. Pick one. LangGraph is the defensible choice — lower-level, more production-realistic.

"Ollama fallback" admits your architecture doesn't require strong reasoning. Real agentic systems don't have a toggle for "worse LLM."

The three-crew structure is arbitrary — none of these tasks require multi-agent orchestration. A single well-prompted LLM with tool use does all three. If you can't articulate why multiple agents are necessary, an interviewer will dismantle you in four questions.

What signals AI Engineer competency: observable state transitions, explicit reasoning traces, deterministic failure modes with recovery, evaluation metrics. Build one agent that does one thing provably well.

### The First Principles Thinker
You are building a conversation piece that makes you hireable, not an impressive project. Those are different optimization targets.

Hirers evaluate three things:
1. **Failure modes** — circuit breakers, tool call depth limits, hallucination handling
2. **Cost awareness** — token budget, retry logic, backoff
3. **Cold explainability** — can you explain the architecture in 10 minutes without the README?

Build one agent that does one thing extremely reliably, with observable intermediate state, and a demo that cannot break. The Job Research agent sourcing real job postings is genuinely useful and demoable.

Don't cargo-cult multi-agent patterns without understanding the tradeoff against simpler chain-of-thought approaches. That's the most common junior AI engineer mistake right now.

### The Expansionist
The ceiling is being set too low. Three agents and a dashboard is a 2024 portfolio. The biggest multiplier: instrument everything and surface the trace. Show token costs per agent run. Build a `/runs` endpoint exposing execution traces. That signals MLOps fluency loudly.

The Anthropic + Ollama fallback pattern is your MLOps story — document latency, cost, and quality deltas per task type. Ship a comparison table. System design conversation starter.

You already have real agentic pipeline experience from Fishburners. DevTrack is a living artifact of your own job search. That narrative is gold — the closing story that wins offers.

### The Outsider
"DevTrack API" tells me nothing about AI. Fix the repo name/subtitle first. I should know within 3 seconds this is an AI project.

Build one agent flawlessly. 90-second demo video pinned to the README. No demo video = project doesn't exist.

Don't build both LangGraph AND CrewAI in Phase 1. Don't build Ollama fallback. Don't build the React dashboard in Phase 1 — Swagger UI is cleaner and more credible to an engineering audience.

The thing that separates you: show a decision the agent made and explain why it was wrong, then show how you fixed it. A "lessons learned" section on agent failure modes is worth more than a third agent. The project isn't the code — it's the story you tell about the code.

### The Executor
Build in this order:
1. Job Research Crew — two CrewAI agents (Researcher + Analyzer), triggered automatically when you post an application
2. LangGraph 4-node StateGraph — fetch profile → fetch JD → gap analysis → talking points
3. React dashboard last — minimal, Analyze button, streamed output

Don't build: Interview Prep Crew, Ollama fallback, RAG pipeline, Docker Compose with 8 services.

Hiring signal: Node.js API → Python microservice → multiple AI agents → structured JSON. One working demo beats three half-built features.

---

## Peer Reviews

**Reviewer 1:** Strongest=D. Blind spot=C (recommends Jupyter notebook — wrong signal for AI Engineer roles). All missed: visa/sponsorship context — the portfolio needs to signal to mid-large companies that can sponsor 482 TSS, not impress startups.

**Reviewer 2:** Strongest=D. Blind spot=A (compelling narrative, no implementation guidance, risks unfocused ambition). All missed: Fishburners internship may be the stronger credential — DevTrack should support it, not lead.

**Reviewer 3:** Strongest=D. Blind spot=A (timeline problem — "living artifact" is perpetually incomplete). All missed: polyglot architecture risk — Node.js + Python + LangGraph = 3 runtime boundaries, each a demo failure point.

**Reviewer 4:** Strongest=D. Blind spot=A (high-variance story — collapses if demo breaks). All missed: GitHub commit history signals engineering process before anyone reads code. Don't squash commits.

**Reviewer 5:** Strongest=D. Blind spot=B (gives build order but doesn't answer differentiation; "Node.js calling Python calling agents" is table stakes by 2026). All missed: Sydney market = fintech/govtech/professional services = reliability and explainability over novelty.

---

## Chairman's Verdict

### Where the Council Agrees
One agent that works flawlessly beats three that are impressive on paper. Failure modes are the interview, not the feature list. The README and demo video are load-bearing.

### Where the Council Clashes
- **CrewAI vs LangGraph:** Pick LangGraph. Using both without a defensible reason is a red flag to senior engineers. LangGraph's explicit state graph is a visual artifact you can explain cold.
- **Living artifact vs frozen portfolio:** Treat as frozen with realistic seed data. The story "I used this during my job search" is still compelling. The demo doesn't need to be live.
- **React dashboard timing:** Skip in Phase 1. Swagger UI is faster, harder to break, more credible to engineering audiences.

### Blind Spots the Council Caught
1. **Visa filter is the real constraint** — target fintech/govtech/professional services in Sydney. They prioritize reliability, audit trails, cost-bounded explainable agents, not demo novelty.
2. **Fishburners internship leads; DevTrack supports** — frame DevTrack as "the engineering depth behind what I'm doing at Fishburners."
3. **GitHub commit history is a credential** — show debugging iterations. Don't squash. Show the work.
4. **Polyglot = demo risk** — build the Python FastAPI service to be demoable in isolation. The Node.js integration is a bonus, not the demo unit.

### The Recommendation
Build ONE LangGraph StateGraph with 4 nodes: fetch profile → fetch JD → gap analysis → talking points. Add a circuit breaker at the gap analysis node (explicit handling for unparseable LLM output, logged fallback, retry ceiling). Add `execution_metadata.token_cost_usd` to every API response. Build a `/runs/{run_id}` endpoint returning full state transition trace. Add one README section: "Failure modes and what I learned."

Do NOT build: Interview Prep crew, Portfolio Strategy workflow, Ollama fallback, React dashboard (Phase 1), CrewAI alongside LangGraph.

### The One Thing to Do First
Before writing a single line of Python: write the cold explanation. Set a 10-minute timer. Explain the architecture, key design decisions, and what breaks first under load — as if speaking to a senior engineer interviewing you. If you can't write it clearly in 10 minutes, you don't yet know what to build.
