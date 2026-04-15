"""Shared pytest fixtures.

We stub the `fli` package at import time so tests can run without the real
dependency installed and without hitting Google Flights over the network.
Real end-to-end verification happens manually, not in CI.
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from types import ModuleType, SimpleNamespace


def _install_fli_stub() -> None:
    """Inject minimal `fli.models` and `fli.search` modules into sys.modules."""
    if "fli" in sys.modules:
        return

    class Airport(str, Enum):
        SFO = "SFO"
        PHX = "PHX"
        MCO = "MCO"
        JFK = "JFK"
        LAX = "LAX"
        LHR = "LHR"

    class SeatType(str, Enum):
        ECONOMY = "ECONOMY"
        PREMIUM_ECONOMY = "PREMIUM_ECONOMY"
        BUSINESS = "BUSINESS"
        FIRST = "FIRST"

    class MaxStops(str, Enum):
        ANY = "ANY"
        NON_STOP = "NON_STOP"
        ONE_STOP = "ONE_STOP"
        TWO_PLUS_STOPS = "TWO_PLUS_STOPS"

    class SortBy(str, Enum):
        CHEAPEST = "CHEAPEST"
        DURATION = "DURATION"
        DEPARTURE_TIME = "DEPARTURE_TIME"
        ARRIVAL_TIME = "ARRIVAL_TIME"

    @dataclass
    class PassengerInfo:
        adults: int = 1

    @dataclass
    class FlightSegment:
        departure_airport: list
        arrival_airport: list
        travel_date: str

    @dataclass
    class FlightSearchFilters:
        passenger_info: PassengerInfo
        flight_segments: list
        seat_type: SeatType
        sort_by: SortBy
        stops: MaxStops | None = None

    models = ModuleType("fli.models")
    models.Airport = Airport
    models.SeatType = SeatType
    models.MaxStops = MaxStops
    models.SortBy = SortBy
    models.PassengerInfo = PassengerInfo
    models.FlightSegment = FlightSegment
    models.FlightSearchFilters = FlightSearchFilters

    search = ModuleType("fli.search")

    class SearchFlights:
        def search(self, filters):  # noqa: ARG002
            return []  # default: override in tests via monkeypatch

    search.SearchFlights = SearchFlights

    root = ModuleType("fli")
    root.models = models
    root.search = search

    sys.modules["fli"] = root
    sys.modules["fli.models"] = models
    sys.modules["fli.search"] = search


_install_fli_stub()


def make_fli_result(
    *,
    price: float = 129.0,
    duration: int = 150,
    stops: int = 0,
    legs: list | None = None,
):
    """Factory for a fake fli result object (duck-typed for our translator)."""
    dep = datetime.now(timezone.utc) + timedelta(days=30)
    arr = dep + timedelta(minutes=duration)
    from fli.models import Airport  # use the stub

    default_leg = SimpleNamespace(
        airline="UA",
        flight_number="UA123",
        departure_airport=Airport.SFO,
        arrival_airport=Airport.PHX,
        departure_datetime=dep,
        arrival_datetime=arr,
        duration=duration,
    )
    return SimpleNamespace(
        price=price,
        duration=duration,
        stops=stops,
        legs=legs or [default_leg],
    )
