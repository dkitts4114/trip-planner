"""Tests for the Amadeus flight search service.

All tests use an injected fake client so no network calls are made.
The fake mirrors the structure of a real Amadeus FlightOffersSearch response.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from unittest.mock import MagicMock

import pytest

from trip_planner.models.flights import CabinClass, FlightSearchRequest, MaxStopsOption
from trip_planner.services.amadeus_search import (
    AmadeusSearchResult,
    _parse_duration_minutes,
    search_amadeus,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_offer(
    price: str = "120.00",
    currency: str = "USD",
    origin: str = "SFO",
    destination: str = "PHX",
    dep_at: str = "2026-05-20T07:00:00",
    arr_at: str = "2026-05-20T09:10:00",
    duration: str = "PT2H10M",
    carrier: str = "UA",
    number: str = "2374",
) -> dict:
    return {
        "itineraries": [
            {
                "duration": duration,
                "segments": [
                    {
                        "departure": {"iataCode": origin, "at": dep_at},
                        "arrival": {"iataCode": destination, "at": arr_at},
                        "carrierCode": carrier,
                        "number": number,
                        "duration": duration,
                    }
                ],
            }
        ],
        "price": {"grandTotal": price, "currency": currency},
    }


def _make_client(offers: list[dict]) -> MagicMock:
    """Fake Amadeus client whose .shopping.flight_offers_search.get() returns offers."""
    resp = MagicMock()
    resp.data = offers
    client = MagicMock()
    client.shopping.flight_offers_search.get.return_value = resp
    return client


def _one_way_req(**kwargs) -> FlightSearchRequest:
    defaults = dict(
        origin="SFO",
        destination="PHX",
        departure_date=date(2026, 5, 20),
    )
    defaults.update(kwargs)
    return FlightSearchRequest(**defaults)


# ---------------------------------------------------------------------------
# Unit tests for helper
# ---------------------------------------------------------------------------

def test_parse_duration_minutes_full():
    assert _parse_duration_minutes("PT2H10M") == 130


def test_parse_duration_minutes_hours_only():
    assert _parse_duration_minutes("PT3H") == 180


def test_parse_duration_minutes_minutes_only():
    assert _parse_duration_minutes("PT45M") == 45


def test_parse_duration_minutes_empty():
    assert _parse_duration_minutes("") == 0


# ---------------------------------------------------------------------------
# Service tests
# ---------------------------------------------------------------------------

def test_no_credentials_returns_unavailable(monkeypatch):
    monkeypatch.setattr(
        "trip_planner.services.amadeus_search.settings",
        MagicMock(amadeus_client_id="", amadeus_client_secret="", amadeus_hostname="test"),
    )
    result = search_amadeus(_one_way_req())
    assert isinstance(result, AmadeusSearchResult)
    assert result.available is False
    assert result.outbound == []
    assert any("credentials" in w.lower() for w in result.warnings)


def test_one_way_returns_outbound(monkeypatch):
    monkeypatch.setattr(
        "trip_planner.services.amadeus_search.settings",
        MagicMock(amadeus_client_id="id", amadeus_client_secret="secret", amadeus_hostname="test"),
    )
    client = _make_client([_make_offer(price="118.00", carrier="UA", number="2374")])
    result = search_amadeus(_one_way_req(), client=client)

    assert result.available is True
    assert result.return_ is None
    assert len(result.outbound) == 1
    it = result.outbound[0]
    assert it.price == 118.0
    assert it.currency == "USD"
    assert it.duration_minutes == 130
    assert it.stops == 0
    assert it.legs[0].airline == "UA"
    assert it.legs[0].origin == "SFO"
    assert it.legs[0].destination == "PHX"


def test_round_trip_queries_return_leg(monkeypatch):
    monkeypatch.setattr(
        "trip_planner.services.amadeus_search.settings",
        MagicMock(amadeus_client_id="id", amadeus_client_secret="secret", amadeus_hostname="test"),
    )
    outbound_offer = _make_offer(origin="SFO", destination="PHX")
    return_offer = _make_offer(origin="PHX", destination="SFO", dep_at="2026-05-25T10:00:00", arr_at="2026-05-25T12:10:00")
    call_count = 0

    def _mock_get(**kwargs):
        nonlocal call_count
        call_count += 1
        resp = MagicMock()
        resp.data = [outbound_offer] if call_count == 1 else [return_offer]
        return resp

    client = MagicMock()
    client.shopping.flight_offers_search.get.side_effect = _mock_get

    req = _one_way_req(return_date=date(2026, 5, 25))
    result = search_amadeus(req, client=client)

    assert result.available is True
    assert len(result.outbound) == 1
    assert result.return_ is not None
    assert len(result.return_) == 1
    assert result.return_[0].direction == "return"
    assert call_count == 2


def test_non_stop_passes_flag(monkeypatch):
    monkeypatch.setattr(
        "trip_planner.services.amadeus_search.settings",
        MagicMock(amadeus_client_id="id", amadeus_client_secret="secret", amadeus_hostname="test"),
    )
    client = _make_client([_make_offer()])
    search_amadeus(_one_way_req(max_stops=MaxStopsOption.NON_STOP), client=client)
    call_kwargs = client.shopping.flight_offers_search.get.call_args.kwargs
    assert call_kwargs.get("nonStop") is True


def test_empty_results_do_not_crash(monkeypatch):
    monkeypatch.setattr(
        "trip_planner.services.amadeus_search.settings",
        MagicMock(amadeus_client_id="id", amadeus_client_secret="secret", amadeus_hostname="test"),
    )
    client = _make_client([])
    result = search_amadeus(_one_way_req(), client=client)
    assert result.available is True
    assert result.outbound == []
    assert any("no outbound" in w.lower() for w in result.warnings)
