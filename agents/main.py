import logging

from fastapi import FastAPI

from config import settings
from routers.intelligence_router import router as intelligence_router

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(
    title="DevTrack Agents",
    description="LangGraph-powered job intelligence microservice",
    version="1.0.0",
)

app.include_router(intelligence_router, prefix="/agents")


@app.get("/health")
def health():
    return {"status": "ok"}
