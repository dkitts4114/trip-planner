"""FastAPI application entry point."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from trip_planner import __version__
from trip_planner.api import flights, health

app = FastAPI(
    title="trip-planner",
    version=__version__,
    description="Personal automated trip-planning tool",
)

# CORS for local Vite dev server
from trip_planner.config import settings  # noqa: E402

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(flights.router)
