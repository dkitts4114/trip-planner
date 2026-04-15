"""Flight search service: wraps punitarani/fli.

Responsibilities:
- Translate our domain `FlightSearchRequest` into fli's `FlightSearchFilters`.
- Invoke fli's `SearchFlights.search()`.
- Translate fli's result objects back into our domain `FlightItinerary` list.

Keeping this translation layer tight means:
- The API / frontend never sees fli-specific types, so we can swap the source
  (Amadeus, SerpAPI, etc.) without breaking consumers.
- Tests can mock the service at a stable seam (either the fli client or the
  `search_flights()` function) without touching fli internals.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from trip_planner.models.flights import (
    CabinClass,
    FlightItinerary,
    FlightLeg,
    FlightSearchRequest,
    MaxStopsOption,
    SortOption,
)


class FliSearcher(Protocol):
    """Protocol matching fli.search.SearchFlights — lets us inject a fake in tests."""

    def search(self, filters: Any) -> list[Any]: ...  # pragma: no cover


@dataclass
class FlightSearchResult:
    """Internal result bundle (outbound + optional return lists)."""

    outbound: list[FlightItinerary]
    return_: list[FlightItinerary] | None


# --- Enum translation helpers -------------------------------------------------

def _cabin_to_fli(cabin: CabinClass):
    from fli.models import SeatType  # local import keeps tests mock-friendly

    return {
        CabinClass.ECONOMY: SeatType.ECONOMY,
        CabinClass.PREMIUM_ECONOMY: SeatType.PREMIUM_ECONOMY,
        CabinClass.BUSINESS: SeatType.BUSINESS,
        CabinClass.FIRST: SeatType.FIRST,
    }[cabin]


def _stops_to_fli(stops: MaxStopsOption):
    from fli.models import MaxStops

    def pick(*names):
        for n in names:
            if hasattr(MaxStops, n):
                return getattr(MaxStops, n)
        return None

    return {
        MaxStopsOption.ANY: pick("ANY"),
        MaxStopsOption.NON_STOP: pick("NON_STOP", "NONSTOP"),
        MaxStopsOption.ONE_STOP: pick("ONE_STOP_OR_FEWER", "ONE_STOP", "AT_MOST_ONE_STOP"),
        MaxStopsOption.TWO_PLUS: pick(
            "TWO_OR_FEWER_STOPS", "TWO_PLUS_STOPS", "TWO_STOPS_OR_FEWER", "ANY"
        ),
    }[stops]


def _sort_to_fli(sort: SortOption):
    from fli.models import SortBy

    return {
        SortOption.CHEAPEST: SortBy.CHEAPEST,
        SortOption.FASTEST: getattr(SortBy, "DURATION", SortBy.CHEAPEST),
        SortOption.DEPARTURE: getattr(SortBy, "DEPARTURE_TIME", SortBy.CHEAPEST),
        SortOption.ARRIVAL: getattr(SortBy, "ARRIVAL_TIME", SortBy.CHEAPEST),
    }[sort]


def _airport(code: str):
    from fli.models import Airport

    return getattr(Airport, code.upper())


# --- Result translation -------------------------------------------------------

def _to_itinerary(fli_result: Any) -> FlightItinerary:
    """Translate a single fli result object into our FlightItinerary."""
    legs = []
    for leg in getattr(fli_result, "legs", []) or []:
        legs.append(
            FlightLeg(
                airline=_attr(leg, "airline", default=""),
                flight_number=str(_attr(leg, "flight_number", default="")),
                origin=_attr_code(leg, "departure_airport"),
                destination=_attr_code(leg, "arrival_airport"),
                departure_time=_attr(leg, "departure_datetime"),
                arrival_time=_attr(leg, "arrival_datetime"),
                duration_minutes=_attr(leg, "duration", default=None),
            )
        )
    return FlightItinerary(
        price=float(_attr(fli_result, "price", default=0) or 0),
        duration_minutes=int(_attr(fli_result, "duration", default=0) or 0),
        stops=int(_attr(fli_result, "stops", default=len(legs) - 1 if legs else 0) or 0),
        legs=legs,
    )


def _attr(obj: Any, name: str, default: Any = None) -> Any:
    """Pull an attribute by name; fli sometimes uses Enum values — .value unwraps them."""
    val = getattr(obj, name, default)
    return getattr(val, "value", val) if val is not None else default


def _attr_code(obj: Any, name: str) -> str:
    """Return the IATA code for an Airport-typed attribute."""
    val = getattr(obj, name, None)
    if val is None:
        return ""
    return getattr(val, "name", None) or getattr(val, "value", None) or str(val)


# --- Public entry point -------------------------------------------------------

def _build_filters(req: FlightSearchRequest, leg: str):
    """Build a fli FlightSearchFilters for either the outbound or return leg."""
    from fli.models import FlightSearchFilters, FlightSegment, PassengerInfo

    if leg == "outbound":
        origin, destination, travel_date = req.origin, req.destination, req.departure_date
    elif leg == "return":
        assert req.return_date is not None
        origin, destination, travel_date = req.destination, req.origin, req.return_date
    else:
        raise ValueError(f"unknown leg: {leg}")

    segment = FlightSegment(
        departure_airport=[[_airport(origin), 0]],
        arrival_airport=[[_airport(destination), 0]],
        travel_date=travel_date.strftime("%Y-%m-%d"),
    )
    kwargs = dict(
        passenger_info=PassengerInfo(adults=req.adults),
        flight_segments=[segment],
        seat_type=_cabin_to_fli(req.cabin),
        sort_by=_sort_to_fli(req.sort_by),
    )
    stops = _stops_to_fli(req.max_stops)
    if stops is not None:
        kwargs["stops"] = stops
    return FlightSearchFilters(**kwargs)


def search_flights(
    req: FlightSearchRequest, *, searcher: FliSearcher | None = None
) -> FlightSearchResult:
    """Top-level entry point: returns outbound + optional return itineraries."""
    if searcher is None:
        from fli.search import SearchFlights

        searcher = SearchFlights()

    outbound_raw = searcher.search(_build_filters(req, "outbound")) or []
    outbound = [_to_itinerary(r) for r in outbound_raw]

    return_: list[FlightItinerary] | None = None
    if req.return_date is not None:
        return_raw = searcher.search(_build_filters(req, "return")) or []
        return_ = [_to_itinerary(r) for r in return_raw]

    return FlightSearchResult(outbound=outbound, return_=return_)
