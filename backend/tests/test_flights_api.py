"""Endpoint test: POST /api/flights/search wires through the service correctly."""
from __future__ import annotations

from datetime import date, timedelta

from fastapi.testclient import TestClient

from trip_planner.main import app
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
    from trip_planner.services.flight_search import _to_itinerary

    def fake_search(req, *, searcher=None):
        return FlightSearchResult(
            outbound=[_to_itinerary(make_fli_result(price=149.0))],
            return_=None,
        )

    monkeypatch.setattr("trip_planner.api.flights.search_flights", fake_search)

    r = TestClient(app).post("/api/flights/search", json=_body())
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["source"] == "fli"
    assert data["outbound"][0]["price"] == 149.0
    assert data["ret"] is None
    assert data["warnings"] == []


def test_flight_search_endpoint_returns_502_on_upstream_error(monkeypatch):
    def boom(req, *, searcher=None):
        raise RuntimeError("fli exploded")

    monkeypatch.setattr("trip_planner.api.flights.search_flights", boom)

    r = TestClient(app).post("/api/flights/search", json=_body())
    assert r.status_code == 502
    assert "fli exploded" in r.json()["detail"]


def test_flight_search_endpoint_surfaces_empty_warning(monkeypatch):
    def empty(req, *, searcher=None):
        return FlightSearchResult(outbound=[], return_=None)

    monkeypatch.setattr("trip_planner.api.flights.search_flights", empty)

    r = TestClient(app).post(
        "/api/flights/search",
        json=_body(destination="MCO"),
    )
    assert r.status_code == 200
    assert r.json()["warnings"], "expected a 'no outbound' warning"
