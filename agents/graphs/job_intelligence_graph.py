"""
Job Intelligence LangGraph StateGraph
4 nodes: fetch_profile → fetch_job_description → gap_analysis → talking_points

Key design decisions (for interview cold-explanation):
- TypedDict state: fully typed, no magic dicts
- Circuit breaker at gap_analysis: explicit failure handling, retry ceiling of 2
- token_cost_usd tracked per run: production cost awareness
- Module-level compiled graph: compile once per worker, invoke per request
- asyncio.to_thread wrapper: LangGraph .invoke() is sync, don't block FastAPI's event loop
"""

import asyncio
import json
import logging
import time
import uuid
from typing import Any, Optional, TypedDict

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

from config import settings

logger = logging.getLogger(__name__)

# In-memory run store: { run_id: RunTrace }
# In production, replace with Redis or SQLite for persistence
_run_store: dict[str, dict] = {}


# ─────────────────────────────────────────────────────────────
# TYPED STATE
# ─────────────────────────────────────────────────────────────

class JobIntelligenceState(TypedDict):
    # Input
    application_id: str
    company_name: str
    position_title: str
    job_url: Optional[str]
    notes: Optional[str]
    status: Optional[str]
    applied_date: Optional[str]

    # Computed by nodes
    user_profile_summary: Optional[str]
    job_description_summary: Optional[str]
    gap_analysis: Optional[dict]
    talking_points: Optional[list]

    # Circuit breaker
    circuit_breaker_triggered: bool
    gap_analysis_retries: int
    error: Optional[str]

    # Observability
    run_id: str
    token_usage: dict  # { input_tokens, output_tokens, cost_usd }
    node_trace: list   # [{ node, input_snapshot, output_snapshot, duration_ms }]


# ─────────────────────────────────────────────────────────────
# LLM FACTORY — multi-provider abstraction
# Switching providers is a one-env-var change. All providers
# return AIMessage with response_metadata.usage so the rest of
# the graph is provider-agnostic.
# ─────────────────────────────────────────────────────────────

def _get_llm() -> BaseChatModel:
    provider = settings.llm_provider

    if provider == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=settings.groq_model,
            api_key=settings.groq_api_key,
            temperature=0.3,
            max_tokens=1024,
            timeout=60,
        )

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.google_api_key,
            temperature=0.3,
            max_output_tokens=1024,
        )

    if provider == "ollama":
        from langchain_ollama import ChatOllama
        return ChatOllama(
            model=settings.ollama_model,
            base_url=settings.ollama_base_url,
            temperature=0.3,
        )

    raise ValueError(f"Unsupported LLM_PROVIDER: {provider}")


# Per-provider pricing for cost tracking (USD per token).
# All free tiers report $0 — useful as a budget signal.
_PRICING = {
    "groq":   {"input": 0.00, "output": 0.00},   # Free tier — no per-token cost
    "gemini": {"input": 0.00, "output": 0.00},   # Free tier — rate-limited, no cost
    "ollama": {"input": 0.00, "output": 0.00},   # Local inference
}


def _calculate_cost(input_tokens: int, output_tokens: int) -> float:
    pricing = _PRICING.get(settings.llm_provider, {"input": 0.0, "output": 0.0})
    return round(
        (input_tokens * pricing["input"]) + (output_tokens * pricing["output"]),
        6,
    )


def _accumulate_usage(state: JobIntelligenceState, response_metadata: dict) -> dict:
    """
    Provider-agnostic token accumulation.
    Different providers expose usage in different shapes:
      - Groq:   response_metadata.token_usage.{prompt_tokens, completion_tokens}
      - Gemini: response_metadata.usage_metadata.{input_tokens, output_tokens}
      - Ollama: response_metadata.{eval_count, prompt_eval_count}
    """
    usage = (
        response_metadata.get("usage")
        or response_metadata.get("token_usage")
        or response_metadata.get("usage_metadata")
        or {}
    )
    input_tokens = (
        usage.get("input_tokens")
        or usage.get("prompt_tokens")
        or response_metadata.get("prompt_eval_count")
        or 0
    )
    output_tokens = (
        usage.get("output_tokens")
        or usage.get("completion_tokens")
        or response_metadata.get("eval_count")
        or 0
    )

    prev = state.get("token_usage") or {"input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0}
    new_input = prev["input_tokens"] + input_tokens
    new_output = prev["output_tokens"] + output_tokens
    return {
        "input_tokens": new_input,
        "output_tokens": new_output,
        "cost_usd": _calculate_cost(new_input, new_output),
    }


def _append_trace(state: JobIntelligenceState, node_name: str, input_snap: dict, output_snap: dict, duration_ms: int) -> list:
    trace = list(state.get("node_trace") or [])
    trace.append({
        "node": node_name,
        "input_snapshot": input_snap,
        "output_snapshot": output_snap,
        "duration_ms": duration_ms,
    })
    return trace


# ─────────────────────────────────────────────────────────────
# NODE 1: fetch_profile
# Summarises what we know about the candidate from the application record
# ─────────────────────────────────────────────────────────────

def fetch_profile(state: JobIntelligenceState) -> dict:
    t0 = time.monotonic()
    node_name = "fetch_profile"
    logger.info(f"[{state['run_id']}] Node: {node_name}")

    input_snap = {
        "company_name": state["company_name"],
        "position_title": state["position_title"],
        "notes": state.get("notes"),
    }

    # We synthesise a profile summary from the application context.
    # In a richer system, this node would call an external profile API.
    profile = (
        f"Candidate is applying for {state['position_title']} at {state['company_name']}. "
        f"Application status: {state.get('status', 'applied')}. "
    )
    if state.get("notes"):
        profile += f"Candidate notes: {state['notes']}"
    if state.get("applied_date"):
        profile += f" Applied on: {state['applied_date']}."

    duration_ms = int((time.monotonic() - t0) * 1000)
    output_snap = {"user_profile_summary": profile}

    return {
        "user_profile_summary": profile,
        "node_trace": _append_trace(state, node_name, input_snap, output_snap, duration_ms),
    }


# ─────────────────────────────────────────────────────────────
# NODE 2: fetch_job_description
# Synthesises a job description from available context (URL, title, company)
# In production, this node would scrape the job URL with a web tool
# ─────────────────────────────────────────────────────────────

def fetch_job_description(state: JobIntelligenceState) -> dict:
    t0 = time.monotonic()
    node_name = "fetch_job_description"
    logger.info(f"[{state['run_id']}] Node: {node_name}")

    input_snap = {
        "company_name": state["company_name"],
        "position_title": state["position_title"],
        "job_url": state.get("job_url"),
    }

    llm = _get_llm()
    messages = [
        SystemMessage(content=(
            "You are a job description analyst. Given a company name, role title, "
            "and optional job URL, synthesise a concise job description summary covering: "
            "likely responsibilities, required skills, and seniority level. "
            "If you don't know specifics, make reasonable inferences based on the role title and company. "
            "Be concise — 3-4 sentences max."
        )),
        HumanMessage(content=(
            f"Company: {state['company_name']}\n"
            f"Role: {state['position_title']}\n"
            f"Job URL: {state.get('job_url') or 'Not provided'}"
        )),
    ]

    response = llm.invoke(messages)
    jd_summary = response.content

    token_usage = _accumulate_usage(state, response.response_metadata)
    duration_ms = int((time.monotonic() - t0) * 1000)
    output_snap = {"job_description_summary": jd_summary[:200] + "..."}

    return {
        "job_description_summary": jd_summary,
        "token_usage": token_usage,
        "node_trace": _append_trace(state, node_name, input_snap, output_snap, duration_ms),
    }


# ─────────────────────────────────────────────────────────────
# NODE 3: gap_analysis  ← CIRCUIT BREAKER HERE
# Uses structured output to compare profile vs JD.
# Circuit breaker: if LLM returns unparseable JSON → log, increment retry,
# conditional edge routes to error node after 2 retries.
# ─────────────────────────────────────────────────────────────

def gap_analysis(state: JobIntelligenceState) -> dict:
    # Note: node is registered as "analyze_gap" — LangGraph forbids node names
    # matching state keys, and "gap_analysis" is already a state field.
    t0 = time.monotonic()
    node_name = "analyze_gap"
    retries = state.get("gap_analysis_retries", 0)
    logger.info(f"[{state['run_id']}] Node: {node_name} (attempt {retries + 1})")

    input_snap = {
        "profile_summary": (state.get("user_profile_summary") or "")[:100],
        "jd_summary": (state.get("job_description_summary") or "")[:100],
        "retry": retries,
    }

    llm = _get_llm()
    messages = [
        SystemMessage(content=(
            "You are a senior career coach. Compare the candidate's profile against the job description. "
            "Return ONLY valid JSON in this exact shape, no explanation:\n"
            '{"strengths": ["..."], "gaps": ["..."], "fit_score": "Low|Medium|High", '
            '"fit_rationale": "one sentence"}\n'
            "strengths and gaps must each have 2-4 items."
        )),
        HumanMessage(content=(
            f"Candidate profile:\n{state.get('user_profile_summary')}\n\n"
            f"Job description:\n{state.get('job_description_summary')}"
        )),
    ]

    response = llm.invoke(messages)
    token_usage = _accumulate_usage(state, response.response_metadata)
    duration_ms = int((time.monotonic() - t0) * 1000)

    try:
        raw = response.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)

        # Validate shape
        assert isinstance(parsed.get("strengths"), list)
        assert isinstance(parsed.get("gaps"), list)
        assert parsed.get("fit_score") in ("Low", "Medium", "High")

        output_snap = {"gap_analysis": parsed, "circuit_breaker_triggered": False}
        logger.info(f"[{state['run_id']}] gap_analysis succeeded, fit_score={parsed['fit_score']}")

        return {
            "gap_analysis": parsed,
            "circuit_breaker_triggered": False,
            "token_usage": token_usage,
            "node_trace": _append_trace(state, node_name, input_snap, output_snap, duration_ms),
        }

    except (json.JSONDecodeError, AssertionError, KeyError) as exc:
        logger.warning(f"[{state['run_id']}] gap_analysis parse failure (retry {retries + 1}): {exc}")
        output_snap = {"circuit_breaker_triggered": True, "gap_analysis_retries": retries + 1}
        return {
            "circuit_breaker_triggered": True,
            "gap_analysis_retries": retries + 1,
            "error": f"gap_analysis: LLM returned unparseable output (attempt {retries + 1}): {exc}",
            "token_usage": token_usage,
            "node_trace": _append_trace(state, node_name, input_snap, output_snap, duration_ms),
        }


# ─────────────────────────────────────────────────────────────
# NODE 4: talking_points
# Generates actionable talking points from gap analysis
# ─────────────────────────────────────────────────────────────

def talking_points(state: JobIntelligenceState) -> dict:
    t0 = time.monotonic()
    node_name = "talking_points"
    logger.info(f"[{state['run_id']}] Node: {node_name}")

    input_snap = {"gap_analysis_fit_score": state.get("gap_analysis", {}).get("fit_score")}

    llm = _get_llm()
    gap = state.get("gap_analysis", {})
    messages = [
        SystemMessage(content=(
            "You are a career coach. Generate 5 specific, actionable talking points "
            "the candidate should emphasise in their application or interview. "
            "Return ONLY a JSON array of strings, no explanation.\n"
            'Example: ["Point 1", "Point 2"]'
        )),
        HumanMessage(content=(
            f"Role: {state['position_title']} at {state['company_name']}\n"
            f"Strengths: {gap.get('strengths', [])}\n"
            f"Gaps: {gap.get('gaps', [])}\n"
            f"Fit score: {gap.get('fit_score', 'Unknown')}"
        )),
    ]

    response = llm.invoke(messages)
    token_usage = _accumulate_usage(state, response.response_metadata)
    duration_ms = int((time.monotonic() - t0) * 1000)

    try:
        raw = response.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        points = json.loads(raw)
        if not isinstance(points, list):
            points = [str(points)]
    except (json.JSONDecodeError, ValueError):
        points = [response.content]

    output_snap = {"talking_points_count": len(points)}
    logger.info(f"[{state['run_id']}] talking_points generated {len(points)} points")

    return {
        "talking_points": points,
        "token_usage": token_usage,
        "node_trace": _append_trace(state, node_name, input_snap, output_snap, duration_ms),
    }


# ─────────────────────────────────────────────────────────────
# ERROR NODE — reached when circuit breaker exhausted
# ─────────────────────────────────────────────────────────────

def handle_error(state: JobIntelligenceState) -> dict:
    logger.error(f"[{state['run_id']}] Circuit breaker exhausted after {state.get('gap_analysis_retries')} retries")
    return {
        "talking_points": [],
        "error": state.get("error", "Agent failed after maximum retries"),
    }


# ─────────────────────────────────────────────────────────────
# CONDITIONAL EDGE — circuit breaker routing
# Retry gap_analysis up to 2 times, then route to error
# ─────────────────────────────────────────────────────────────

def _route_after_gap_analysis(state: JobIntelligenceState) -> str:
    if not state.get("circuit_breaker_triggered"):
        return "talking_points"
    if state.get("gap_analysis_retries", 0) < 2:
        return "analyze_gap"  # retry — node name (state key collision avoidance)
    return "handle_error"


# ─────────────────────────────────────────────────────────────
# GRAPH ASSEMBLY — compiled once at import time
# ─────────────────────────────────────────────────────────────

def _build_graph() -> Any:
    g = StateGraph(JobIntelligenceState)

    g.add_node("fetch_profile", fetch_profile)
    g.add_node("fetch_job_description", fetch_job_description)
    g.add_node("analyze_gap", gap_analysis)  # node name differs from state key "gap_analysis"
    g.add_node("talking_points", talking_points)
    g.add_node("handle_error", handle_error)

    g.set_entry_point("fetch_profile")
    g.add_edge("fetch_profile", "fetch_job_description")
    g.add_edge("fetch_job_description", "analyze_gap")

    # Conditional edge: retry loop or proceed
    g.add_conditional_edges(
        "analyze_gap",
        _route_after_gap_analysis,
        {
            "talking_points": "talking_points",
            "analyze_gap": "analyze_gap",   # retry edge
            "handle_error": "handle_error",
        },
    )

    g.add_edge("talking_points", END)
    g.add_edge("handle_error", END)

    return g.compile()


# Module-level compiled graph — one instance per worker process
_graph = _build_graph()


# ─────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────

def _invoke_graph(initial_state: JobIntelligenceState) -> JobIntelligenceState:
    return _graph.invoke(initial_state)


async def run_job_intelligence(request_data: dict) -> dict:
    """
    Async entrypoint — wraps the synchronous LangGraph invoke in a thread
    so FastAPI's event loop is never blocked.
    """
    run_id = str(uuid.uuid4())
    t_start = time.monotonic()

    initial_state: JobIntelligenceState = {
        "application_id": request_data["application_id"],
        "company_name": request_data["company_name"],
        "position_title": request_data["position_title"],
        "job_url": request_data.get("job_url"),
        "notes": request_data.get("notes"),
        "status": request_data.get("status"),
        "applied_date": request_data.get("applied_date"),
        "user_profile_summary": None,
        "job_description_summary": None,
        "gap_analysis": None,
        "talking_points": None,
        "circuit_breaker_triggered": False,
        "gap_analysis_retries": 0,
        "error": None,
        "run_id": run_id,
        "token_usage": {"input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0},
        "node_trace": [],
    }

    final_state: JobIntelligenceState = await asyncio.to_thread(_invoke_graph, initial_state)

    duration_ms = int((time.monotonic() - t_start) * 1000)
    token_usage = final_state.get("token_usage") or {"cost_usd": 0.0}
    nodes_executed = [t["node"] for t in (final_state.get("node_trace") or [])]

    result = {
        "data": {
            "gap_analysis": final_state.get("gap_analysis"),
            "talking_points": final_state.get("talking_points") or [],
            "error": final_state.get("error"),
        },
        "execution_metadata": {
            "run_id": run_id,
            "token_cost_usd": token_usage.get("cost_usd", 0.0),
            "duration_ms": duration_ms,
            "circuit_breaker_triggered": final_state.get("circuit_breaker_triggered", False),
            "nodes_executed": nodes_executed,
        },
    }

    # Store trace for /runs/{run_id} endpoint
    _run_store[run_id] = {
        "run_id": run_id,
        "application_id": request_data["application_id"],
        "node_trace": final_state.get("node_trace") or [],
        "final_state_summary": {
            "gap_analysis": final_state.get("gap_analysis"),
            "talking_points": final_state.get("talking_points"),
            "circuit_breaker_triggered": final_state.get("circuit_breaker_triggered"),
            "token_usage": final_state.get("token_usage"),
            "error": final_state.get("error"),
        },
        "execution_metadata": result["execution_metadata"],
    }

    logger.info(
        f"[{run_id}] Run complete | "
        f"duration={duration_ms}ms | "
        f"cost=${token_usage.get('cost_usd', 0.0):.6f} | "
        f"nodes={nodes_executed} | "
        f"circuit_breaker={final_state.get('circuit_breaker_triggered')}"
    )

    return result


def get_run_trace(run_id: str) -> dict | None:
    return _run_store.get(run_id)
