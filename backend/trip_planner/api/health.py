"""Health / liveness endpoint."""
from __future__ import annotations

from fastapi import APIRouter

from trip_planner import __version__

router = APIRouter(tags=["meta"])


@router.get("/api/health")
def health() -> dict:
    return {"status": "ok", "version": __version__}
