// Typed API client. Matches the Pydantic models in backend/.../models/flights.py.
// Keep names in sync; any divergence should fail at compile time once we start
// consuming individual fields.

export type CabinClass = "economy" | "premium_economy" | "business" | "first";
export type MaxStopsOption = "any" | "non_stop" | "one_stop" | "two_plus";
export type SortOption = "cheapest" | "fastest" | "departure" | "arrival";

export interface FlightSearchRequest {
  origin: string;
  destination: string;
  departure_date: string; // YYYY-MM-DD
  return_date?: string | null;
  adults?: number;
  cabin?: CabinClass;
  max_stops?: MaxStopsOption;
  sort_by?: SortOption;
}

export interface FlightLeg {
  airline: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number | null;
}

export interface FlightItinerary {
  direction: "outbound" | "return";
  price: number;
  currency: string;
  duration_minutes: number;
  stops: number;
  legs: FlightLeg[];
}

export interface SourceResult {
  outbound: FlightItinerary[];
  ret: FlightItinerary[] | null;
  available: boolean;
  warnings: string[];
}

export interface FlightSearchResponse {
  request: FlightSearchRequest;
  fli: SourceResult;
  amadeus: SourceResult;
}

export async function searchFlights(
  req: FlightSearchRequest,
): Promise<FlightSearchResponse> {
  const r = await fetch("/api/flights/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Search failed (${r.status}): ${text}`);
  }
  return r.json();
}
