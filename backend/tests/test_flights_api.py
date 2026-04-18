"""Endpoint test: POST /api/flights/search wires through both services correctly."""
from __future__ import annotations

from datetime import date, timedelta
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from trip_planner.main import app
from trip_planner.services.amadeus_search import AmadeusSearchResult
from trip_planner.services.flight_search import FlightSearchResult

from .conftest import make_fli_result


def _body(**kwargs):
    defaults = {
        "origin": "SFO",
        "destination": "PHX",
        "departure_date": str(date.today() + timedelta(days=30)),
        "adults": 1,
        "cabin": "economy",
        "max_stops": "non_stop",
        "sort_by": "cheapest",
    }
    defaults.update(kwargs)
    return defaults


def test_flight_search_endpoint_happy_path(monkeypatch):
    """Both sources return results → 200 with fli and amadeus sections."""
    from trip_planner.services.flight_search import _to_itinerary

    def fake_fli(req, *, searcher=None):
        return FlightSearchResult(
            outbound=[_to_itinerary(make_fli_result(price=149.0))],
            return_=None,
        )

    def fake_amadeus(req, *, client=None):
        from trip_planner.services.flight_search import _to_itinerary as _t
        return AmadeusSearchResult(
            outbound=[_to_itinerary(make_fli_result(price=155.0))],
            return_=None,
            available=True,
        )

    monkeypatch.setattr("trip_planner.api.flights.search_flights", fake_fli)
    monkeypatch.setattr("trip_planner.api.flights.search_amadeus", fake_amadeus)

    r = TestClient(app).post("/api/flights/search", json=_body())
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["fli"]["outbound"][0]["price"] == 149.0
    assert data["fli"]["available"] is True
    assert data["amadeus"]["outbound"][0]["price"] == 155.0
    assert data["amadeus"]["available"] is True


def test_flight_search_endpoint_returns_502_when_both_fail(monkeypatch):
    """If BOTH sources fail, the endpoint must return 502."""
    def boom(req, *, searcher=None):
        raise RuntimeError("fli exploded")

    def amadeus_fail(req, *, client=None):
        return AmadeusSearchResult(available=False, warnings=["amadeus down"])

    monkeypatch.setattr("trip_planner.api.flights.search_flights", boom)
    monkeypatch.setattr("trip_planner.api.flights.search_amadeus", amadeus_fail)

    r = TestClient(app).post("/api/flights/search", json=_body())
    assert r.status_code == 502
    assert "fli exploded" in r.json()["detail"]


def test_one_source_failing_still_returns_200(monkeypatch):
    """If only Amadeus fails, fli results still come back as 200."""
    from trip_planner.services.flight_search import _to_itinerary

    def fake_fli(req, *, searcher=None):
        return FlightSearchResult(
            outbound=[_to_itinerary(make_fli_result(price=120.0))],
            return_=None,
        )

    def amadeus_fail(req, *, client=None):
        return AmadeusSearchResult(available=False, warnings=["no creds"])

    monkeypatch.setattr("trip_planner.api.flights.search_flights", fake_fli)
    monkeypatch.setattr("trip_planner.api.flights.search_amadeus", amadeus_fail)

    r = TestClient(app).post("/api/flights/search", json=_body())
    assert r.status_code == 200
    data = r.json()
    assert data["fli"]["available"] is True
    assert len(data["fli"]["outbound"]) == 1
    assert data["amadeus"]["available"] is False


def test_flight_search_endpoint_surfaces_empty_warning(monkeypatch):
    """Empty fli results → warning appears in fli.warnings."""
    def empty_fli(req, *, searcher=None):
        return FlightSearchResult(outbound=[], return_=None)

    def amadeus_fail(req, *, client=None):
        return AmadeusSearchResult(available=False, warnings=["no creds"])

    monkeypatch.setattr("trip_planner.api.flights.search_flights", empty_fli)
    monkeypatch.setattr("trip_planner.api.flights.search_amadeus", amadeus_fail)

    r = TestClient(app).post(
        "/api/flights/search",
        json=_body(destination="MCO"),
    )
    assert r.status_code == 200
    assert r.json()["fli"]["warnings"], "expected a 'no outbound' warning in fli.warnings"
