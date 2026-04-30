from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any


class AnalyzeRequest(BaseModel):
    application_id: str
    company_name: str
    position_title: str
    job_url: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    applied_date: Optional[str] = None


class GapAnalysis(BaseModel):
    strengths: List[str]
    gaps: List[str]
    fit_score: str  # "Low" | "Medium" | "High"
    fit_rationale: str


class ExecutionMetadata(BaseModel):
    run_id: str
    token_cost_usd: float
    duration_ms: int
    circuit_breaker_triggered: bool
    nodes_executed: List[str]


class AnalyzeResponse(BaseModel):
    data: Dict[str, Any]
    execution_metadata: ExecutionMetadata
