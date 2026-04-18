"""/api/flights/* endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from trip_planner.models.flights import FlightSearchRequest, FlightSearchResponse
from trip_planner.services.flight_search import search_flights

# NOTE: Amadeus integration is built (services/amadeus_search.py) but not wired
# in here while developers.amadeus.com is unavailable for new signups.
# To re-enable: import search_amadeus, run both in parallel, return dual panels.

router = APIRouter(prefix="/api/flights", tags=["flights"])


@router.post("/search", response_model=FlightSearchResponse)
def flight_search(req: FlightSearchRequest) -> FlightSearchResponse:
    try:
        result = search_flights(req)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Upstream flight search failed: {e}") from e

    warnings: list[str] = []
    if not result.outbound:
        warnings.append("No outbound flights returned for the given criteria.")
    if req.return_date is not None and not result.return_:
        warnings.append("No return flights returned for the given criteria.")

    return FlightSearchResponse(
        request=req,
        outbound=result.outbound,
        ret=result.return_,
        source="fli",
        warnings=warnings,
    )
