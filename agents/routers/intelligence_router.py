import logging

from fastapi import APIRouter, HTTPException

from graphs.job_intelligence_graph import get_run_trace, run_job_intelligence
from schemas.job_intelligence import AnalyzeRequest

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/analyze")
async def analyze_endpoint(request: AnalyzeRequest):
    try:
        logger.info(f"analyze: company={request.company_name}, role={request.position_title}")
        result = await run_job_intelligence(request.model_dump())
        return result
    except Exception as exc:
        logger.error(f"analyze failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/runs/{run_id}")
async def get_run_endpoint(run_id: str):
    trace = get_run_trace(run_id)
    if trace is None:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    return trace
