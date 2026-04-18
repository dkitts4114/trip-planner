"""Amadeus flight search service.

Wraps the Amadeus Self-Service SDK (free tier) to provide a second data source
alongside fli/Google Flights.  Translation layer keeps Amadeus types fully
internal — callers only ever see FlightItinerary domain objects.

If credentials are absent (AMADEUS_CLIENT_ID / SECRET empty) the service
returns an empty result with a warning rather than crashing, so the fli
results still reach the user.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from trip_planner.config import settings
from trip_planner.models.flights import (
    CabinClass,
    FlightItinerary,
    FlightLeg,
    FlightSearchRequest,
    MaxStopsOption,
)


@dataclass
class AmadeusSearchResult:
    outbound: list[FlightItinerary] = field(default_factory=list)
    return_: list[FlightItinerary] | None = None
    available: bool = True
    warnings: list[str] = field(default_factory=list)


# --- Duration parsing --------------------------------------------------------

_ISO_DURATION = re.compile(
    r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", re.IGNORECASE
)


def _parse_duration_minutes(iso: str) -> int:
    """Convert ISO 8601 duration string (e.g. PT2H10M) to total minutes."""
    m = _ISO_DURATION.match(iso or "")
    if not m:
        return 0
    hours = int(m.group(1) or 0)
    minutes = int(m.group(2) or 0)
    return hours * 60 + minutes


# --- Enum translation --------------------------------------------------------

_CABIN_MAP: dict[CabinClass, str] = {
    CabinClass.ECONOMY: "ECONOMY",
    CabinClass.PREMIUM_ECONOMY: "PREMIUM_ECONOMY",
    CabinClass.BUSINESS: "BUSINESS",
    CabinClass.FIRST: "FIRST",
}


# --- Result translation ------------------------------------------------------

def _segment_to_leg(seg: dict[str, Any]) -> FlightLeg:
    carrier = seg.get("carrierCode", "")
    flight_num = seg.get("number", "")
    dep = seg.get("departure", {})
    arr = seg.get("arrival", {})
    duration_str = seg.get("duration", "")

    def _dt(d: dict) -> datetime:
        raw = d.get("at", "")
        for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"):
            try:
                return datetime.strptime(raw, fmt)
            except ValueError:
                continue
        return datetime(1970, 1, 1)

    return FlightLeg(
        airline=carrier,
        flight_number=f"{carrier}{flight_num}",
        origin=dep.get("iataCode", ""),
        destination=arr.get("iataCode", ""),
        departure_time=_dt(dep),
        arrival_time=_dt(arr),
        duration_minutes=_parse_duration_minutes(duration_str) or None,
    )


def _offer_to_itinerary(
    offer: dict[str, Any],
    itinerary_index: int,
    direction: str = "outbound",
) -> FlightItinerary:
    itinerary = offer.get("itineraries", [])[itinerary_index]
    segments = itinerary.get("segments", [])
    legs = [_segment_to_leg(s) for s in segments]
    duration_min = _parse_duration_minutes(itinerary.get("duration", ""))
    price_info = offer.get("price", {})
    try:
        price = float(price_info.get("grandTotal") or price_info.get("total") or 0)
    except (ValueError, TypeError):
        price = 0.0
    currency = price_info.get("currency", "USD")
    stops = max(len(legs) - 1, 0)

    return FlightItinerary(
        direction=direction,  # type: ignore[arg-type]
        price=price,
        currency=currency,
        duration_minutes=duration_min,
        stops=stops,
        legs=legs,
    )


# --- Public entry point -------------------------------------------------------

def search_amadeus(
    req: FlightSearchRequest,
    *,
    client: Any = None,  # injectable for tests
) -> AmadeusSearchResult:
    """Search Amadeus for outbound (and optionally return) itineraries."""
    # Gracefully skip if credentials are not configured.
    if not settings.amadeus_client_id or not settings.amadeus_client_secret:
        return AmadeusSearchResult(
            available=False,
            warnings=["Amadeus credentials not configured — skipping Amadeus source."],
        )

    if client is None:
        try:
            from amadeus import Client

            client = Client(
                client_id=settings.amadeus_client_id,
                client_secret=settings.amadeus_client_secret,
                hostname=settings.amadeus_hostname,
            )
        except Exception as exc:  # noqa: BLE001
            return AmadeusSearchResult(
                available=False,
                warnings=[f"Amadeus client init failed: {exc}"],
            )

    def _fetch(origin: str, destination: str, dep_date: str) -> list[FlightItinerary]:
        params: dict[str, Any] = dict(
            originLocationCode=origin,
            destinationLocationCode=destination,
            departureDate=dep_date,
            adults=req.adults,
            currencyCode="USD",
            max=20,
            travelClass=_CABIN_MAP[req.cabin],
        )
        if req.max_stops == MaxStopsOption.NON_STOP:
            params["nonStop"] = True

        try:
            from amadeus import ResponseError

            response = client.shopping.flight_offers_search.get(**params)
            offers: list[dict] = response.data or []
        except ResponseError as exc:
            raise RuntimeError(f"Amadeus API error: {exc}") from exc

        results = []
        for offer in offers:
            try:
                results.append(_offer_to_itinerary(offer, 0))
            except Exception:  # noqa: BLE001 — skip malformed offers
                continue
        return results

    try:
        outbound = _fetch(req.origin, req.destination, req.departure_date.strftime("%Y-%m-%d"))
    except Exception as exc:  # noqa: BLE001
        return AmadeusSearchResult(
            available=False,
            warnings=[f"Amadeus outbound search failed: {exc}"],
        )

    return_flights: list[FlightItinerary] | None = None
    warnings: list[str] = []

    if req.return_date is not None:
        try:
            raw_return = _fetch(
                req.destination, req.origin, req.return_date.strftime("%Y-%m-%d")
            )
            return_flights = [
                f.model_copy(update={"direction": "return"}) for f in raw_return
            ]
        except Exception as exc:  # noqa: BLE001
            warnings.append(f"Amadeus return search failed: {exc}")

    if not outbound:
        warnings.append("Amadeus returned no outbound flights for the given criteria.")
    if req.return_date is not None and not return_flights:
        warnings.append("Amadeus returned no return flights for the given criteria.")

    return AmadeusSearchResult(
        outbound=outbound,
        return_=return_flights,
        available=True,
        warnings=warnings,
    )
