"""
Unit tests for the Job Intelligence graph.
Patches _get_llm so no real LLM API calls are made — provider-agnostic.
"""

import json
from unittest.mock import MagicMock, patch

import pytest


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _make_llm_response(content: str, input_tokens: int = 50, output_tokens: int = 100) -> MagicMock:
    """Mock an AIMessage in the Groq/Gemini-style metadata shape."""
    msg = MagicMock()
    msg.content = content
    msg.response_metadata = {
        "token_usage": {
            "prompt_tokens": input_tokens,
            "completion_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
        }
    }
    return msg


VALID_GAP_ANALYSIS = json.dumps({
    "strengths": ["Strong Python background", "Prior agentic pipeline experience"],
    "gaps": ["No fintech domain experience"],
    "fit_score": "High",
    "fit_rationale": "Candidate's AI background aligns well with the role requirements.",
})

VALID_TALKING_POINTS = json.dumps([
    "Highlight your LangGraph experience",
    "Mention the Fishburners internship",
    "Emphasise production-grade API design",
    "Reference cost-aware LLM usage",
    "Discuss observable agent state",
])

SAMPLE_REQUEST = {
    "application_id": "00000000-0000-4000-a000-000000000001",
    "company_name": "Atlassian",
    "position_title": "AI Engineer",
    "job_url": "https://atlassian.com/jobs/ai-engineer",
    "notes": "Applied via LinkedIn referral",
    "status": "applied",
    "applied_date": "2026-04-01",
}


# ─────────────────────────────────────────────────────────────
# Tests — patch _get_llm directly so we're provider-agnostic
# ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_successful_run():
    """Full happy-path: all 4 nodes execute, circuit breaker stays false."""
    responses = [
        _make_llm_response("AI Engineer at Atlassian typically requires Python, ML pipelines, LLM experience."),
        _make_llm_response(VALID_GAP_ANALYSIS),
        _make_llm_response(VALID_TALKING_POINTS),
    ]
    mock_llm = MagicMock()
    mock_llm.invoke.side_effect = responses

    with patch("graphs.job_intelligence_graph._get_llm", return_value=mock_llm):
        from graphs.job_intelligence_graph import run_job_intelligence
        result = await run_job_intelligence(SAMPLE_REQUEST)

    assert result["data"]["gap_analysis"]["fit_score"] == "High"
    assert len(result["data"]["talking_points"]) == 5
    assert result["execution_metadata"]["circuit_breaker_triggered"] is False
    # On free providers, cost is 0 — assert it's a number, not necessarily > 0
    assert isinstance(result["execution_metadata"]["token_cost_usd"], (int, float))
    nodes = result["execution_metadata"]["nodes_executed"]
    # Nodes are registered as "analyze_gap" and "generate_talking_points"
    # to avoid LangGraph collision with same-named state keys.
    assert "analyze_gap" in nodes
    assert "generate_talking_points" in nodes


@pytest.mark.asyncio
async def test_circuit_breaker_triggers_on_bad_json():
    """gap_analysis returns invalid JSON twice → circuit breaker fires → handle_error."""
    bad_response = _make_llm_response("Sorry, I cannot provide that analysis right now.")
    jd_response = _make_llm_response("AI Engineer role requiring ML and Python skills.")

    mock_llm = MagicMock()
    mock_llm.invoke.side_effect = [jd_response, bad_response, bad_response]

    with patch("graphs.job_intelligence_graph._get_llm", return_value=mock_llm):
        from graphs.job_intelligence_graph import run_job_intelligence
        result = await run_job_intelligence(SAMPLE_REQUEST)

    assert result["execution_metadata"]["circuit_breaker_triggered"] is True
    assert result["data"]["error"] is not None
    assert result["data"]["talking_points"] == []


@pytest.mark.asyncio
async def test_circuit_breaker_retries_once_then_succeeds():
    """gap_analysis fails once, succeeds on retry → circuit breaker stays false."""
    jd_response = _make_llm_response("AI Engineer at Atlassian role summary.")
    bad_gap = _make_llm_response("not valid json at all")
    good_gap = _make_llm_response(VALID_GAP_ANALYSIS)
    tp_response = _make_llm_response(VALID_TALKING_POINTS)

    mock_llm = MagicMock()
    mock_llm.invoke.side_effect = [jd_response, bad_gap, good_gap, tp_response]

    with patch("graphs.job_intelligence_graph._get_llm", return_value=mock_llm):
        from graphs.job_intelligence_graph import run_job_intelligence
        result = await run_job_intelligence(SAMPLE_REQUEST)

    assert result["execution_metadata"]["circuit_breaker_triggered"] is False
    assert result["data"]["gap_analysis"]["fit_score"] == "High"


@pytest.mark.asyncio
async def test_run_trace_stored():
    """After a run, the trace is accessible via get_run_trace."""
    responses = [
        _make_llm_response("Job description summary."),
        _make_llm_response(VALID_GAP_ANALYSIS),
        _make_llm_response(VALID_TALKING_POINTS),
    ]
    mock_llm = MagicMock()
    mock_llm.invoke.side_effect = responses

    with patch("graphs.job_intelligence_graph._get_llm", return_value=mock_llm):
        from graphs.job_intelligence_graph import get_run_trace, run_job_intelligence
        result = await run_job_intelligence(SAMPLE_REQUEST)
        run_id = result["execution_metadata"]["run_id"]

    trace = get_run_trace(run_id)
    assert trace is not None
    assert trace["run_id"] == run_id
    assert len(trace["node_trace"]) >= 3


def test_get_run_trace_missing_returns_none():
    from graphs.job_intelligence_graph import get_run_trace
    assert get_run_trace("nonexistent-run-id") is None
