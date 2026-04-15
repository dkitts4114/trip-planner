"""Unit tests for trip_planner.services.flight_search.

Tests use an injected fake searcher so no network and no real fli dependency
is required. The fli package is stubbed in conftest.py.
"""
from __future__ import annotations

from datetime import date, timedelta

from trip_planner.models.flights import (
    CabinClass,
    FlightSearchRequest,
    MaxStopsOption,
    SortOption,
)
from trip_planner.services.flight_search import search_flights

from .conftest import make_fli_result


class FakeSearcher:
    def __init__(self, *, per_call_results: list[list] | None = None):
        self.calls: list = []
        self._queue = per_call_results or [[make_fli_result()]]

    def search(self, filters):
        self.calls.append(filters)
        if not self._queue:
            return []
        return self._queue.pop(0)


def _base_req(**overrides) -> FlightSearchRequest:
    defaults = dict(
        origin="SFO",
        destination="PHX",
        departure_date=date.today() + timedelta(days=30),
        adults=1,
        cabin=CabinClass.ECONOMY,
        max_stops=MaxStopsOption.NON_STOP,
        sort_by=SortOption.CHEAPEST,
    )
    defaults.update(overrides)
    return FlightSearchRequest(**defaults)


def test_one_way_returns_outbound_only():
    fake = FakeSearcher(per_call_results=[[make_fli_result(price=129.0)]])
    result = search_flights(_base_req(), searcher=fake)

    assert result.return_ is None
    assert len(result.outbound) == 1
    it = result.outbound[0]
    assert it.price == 129.0
    assert it.stops == 0
    assert len(it.legs) == 1
    assert it.legs[0].origin == "SFO"
    assert it.legs[0].destination == "PHX"
    assert len(fake.calls) == 1


def test_round_trip_queries_both_legs():
    fake = FakeSearcher(
        per_call_results=[
            [make_fli_result(price=200.0)],
            [make_fli_result(price=180.0)],
        ]
    )
    req = _base_req(return_date=date.today() + timedelta(days=40))
    result = search_flights(req, searcher=fake)

    assert len(result.outbound) == 1
    assert result.return_ is not None and len(result.return_) == 1
    assert result.outbound[0].price == 200.0
    assert result.return_[0].price == 180.0
    # Two upstream calls, one per leg
    assert len(fake.calls) == 2


def test_empty_results_do_not_crash():
    fake = FakeSearcher(per_call_results=[[]])
    result = search_flights(_base_req(), searcher=fake)
    assert result.outbound == []
    assert result.return_ is None


def test_origin_destination_uppercased():
    req = FlightSearchRequest(
        origin="sfo",
        destination="phx",
        departure_date=date.today() + timedelta(days=30),
    )
    assert req.origin == "SFO"
    assert req.destination == "PHX"
