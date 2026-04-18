"""/api/flights/* endpoints."""
from __future__ import annotations

import concurrent.futures

from fastapi import APIRouter, HTTPException

from trip_planner.models.flights import (
    FlightSearchRequest,
    FlightSearchResponse,
    SourceResult,
)
from trip_planner.services.amadeus_search import search_amadeus
from trip_planner.services.flight_search import search_flights

router = APIRouter(prefix="/api/flights", tags=["flights"])


@router.post("/search", response_model=FlightSearchResponse)
def flight_search(req: FlightSearchRequest) -> FlightSearchResponse:
    """Search both fli (Google Flights) and Amadeus simultaneously.

    Both sources are queried in parallel threads.  If one fails it returns an
    unavailable SourceResult with a warning rather than failing the whole
    request — the user still gets data from the working source.
    """

    def _run_fli():
        try:
            result = search_flights(req)
            warnings: list[str] = []
            if not result.outbound:
                warnings.append("fli returned no outbound flights for the given criteria.")
            if req.return_date is not None and not result.return_:
                warnings.append("fli returned no return flights for the given criteria.")
            return SourceResult(
                outbound=result.outbound,
                ret=result.return_,
                available=True,
                warnings=warnings,
            )
        except Exception as exc:  # noqa: BLE001
            return SourceResult(
                available=False,
                warnings=[f"fli search failed: {exc}"],
            )

    def _run_amadeus():
        result = search_amadeus(req)
        return SourceResult(
            outbound=result.outbound,
            ret=result.return_,
            available=result.available,
            warnings=result.warnings,
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        fli_future = pool.submit(_run_fli)
        amadeus_future = pool.submit(_run_amadeus)
        fli_result = fli_future.result()
        amadeus_result = amadeus_future.result()

    # If BOTH sources failed hard, surface a 502 so the frontend shows an error.
    if not fli_result.available and not amadeus_result.available:
        reasons = "; ".join(fli_result.warnings + amadeus_result.warnings)
        raise HTTPException(status_code=502, detail=f"All flight sources failed: {reasons}")

    return FlightSearchResponse(
        request=req,
        fli=fli_result,
        amadeus=amadeus_result,
    )
