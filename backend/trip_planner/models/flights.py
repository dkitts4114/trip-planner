"""Flight search request/response models.

Domain-level Pydantic models used by the API layer and returned to the frontend.
Translation to/from `fli` library objects happens in services/flight_search.py —
callers of the service never see fli-specific types.
"""
from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class CabinClass(str, Enum):
    ECONOMY = "economy"
    PREMIUM_ECONOMY = "premium_economy"
    BUSINESS = "business"
    FIRST = "first"


class MaxStopsOption(str, Enum):
    ANY = "any"
    NON_STOP = "non_stop"
    ONE_STOP = "one_stop"
    TWO_PLUS = "two_plus"


class SortOption(str, Enum):
    CHEAPEST = "cheapest"
    FASTEST = "fastest"
    DEPARTURE = "departure"
    ARRIVAL = "arrival"


class FlightSearchRequest(BaseModel):
    """Request body for POST /api/flights/search."""

    origin: str = Field(min_length=3, max_length=3, description="IATA airport code, e.g. SFO")
    destination: str = Field(min_length=3, max_length=3, description="IATA airport code, e.g. PHX")
    departure_date: date = Field(description="Outbound departure date, YYYY-MM-DD")
    return_date: date | None = Field(
        default=None, description="If set, performs round-trip search"
    )
    adults: int = Field(default=1, ge=1, le=9)
    cabin: CabinClass = CabinClass.ECONOMY
    max_stops: MaxStopsOption = MaxStopsOption.ANY
    sort_by: SortOption = SortOption.CHEAPEST

    @field_validator("origin", "destination")
    @classmethod
    def _upper(cls, v: str) -> str:
        return v.upper()


class FlightLeg(BaseModel):
    airline: str
    flight_number: str
    origin: str
    destination: str
    departure_time: datetime
    arrival_time: datetime
    duration_minutes: int | None = None


class FlightItinerary(BaseModel):
    """A complete one-way or round-trip flight option."""

    direction: Literal["outbound", "return"] = "outbound"
    price: float
    currency: str = "USD"
    duration_minutes: int
    stops: int
    legs: list[FlightLeg]


class FlightSearchResponse(BaseModel):
    request: FlightSearchRequest
    outbound: list[FlightItinerary]
    ret: list[FlightItinerary] | None = Field(
        default=None, description="Return-leg options when round-trip requested"
    )
    source: str = "fli"
    warnings: list[str] = Field(default_factory=list)
