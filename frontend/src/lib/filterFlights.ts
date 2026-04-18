/**
 * Client-side filtering and sorting of flight itineraries.
 * All logic is pure (no side effects) so it's easy to test.
 */
import type { FlightItinerary } from "./api";

export type SortKey =
  | "price"
  | "duration"
  | "departure"
  | "arrival"
  | "layover";

export interface FlightFilters {
  sortBy: SortKey;
  departureStart: number;   // hour 0–23 inclusive
  departureEnd: number;
  arrivalStart: number;
  arrivalEnd: number;
  maxLayoverMinutes: number | null;  // null = no limit
  avoidAirlines: string[];           // uppercase IATA carrier codes e.g. ["AA","DL"]
  avoidLayoverAirports: string[];    // uppercase IATA airport codes e.g. ["ORD"]
}

export const DEFAULT_FILTERS: FlightFilters = {
  sortBy: "price",
  departureStart: 0,
  departureEnd: 23,
  arrivalStart: 0,
  arrivalEnd: 23,
  maxLayoverMinutes: null,
  avoidAirlines: [],
  avoidLayoverAirports: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hourOf(isoString: string): number {
  try {
    return new Date(isoString).getHours();
  } catch {
    return 0;
  }
}

/** Total layover time (minutes) across all connecting segments. */
function totalLayoverMinutes(it: FlightItinerary): number {
  let total = 0;
  for (let i = 0; i < it.legs.length - 1; i++) {
    const arrMs = new Date(it.legs[i].arrival_time).getTime();
    const depMs = new Date(it.legs[i + 1].departure_time).getTime();
    if (!isNaN(arrMs) && !isNaN(depMs)) {
      total += Math.max(0, (depMs - arrMs) / 60_000);
    }
  }
  return total;
}

/** All intermediate airport codes (not origin/destination of the full itinerary). */
function layoverAirports(it: FlightItinerary): string[] {
  if (it.legs.length <= 1) return [];
  // Every intermediate landing / takeoff point
  const airports: string[] = [];
  for (let i = 0; i < it.legs.length - 1; i++) {
    airports.push(it.legs[i].destination.toUpperCase());
  }
  return airports;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function applyFilters(
  itineraries: FlightItinerary[],
  f: FlightFilters
): FlightItinerary[] {
  const avoidAirlines = new Set(f.avoidAirlines.map((a) => a.toUpperCase()));
  const avoidAirports = new Set(f.avoidLayoverAirports.map((a) => a.toUpperCase()));

  let results = itineraries.filter((it) => {
    const first = it.legs[0];
    const last = it.legs[it.legs.length - 1];

    // Departure time window
    const depHour = first ? hourOf(first.departure_time) : 0;
    if (depHour < f.departureStart || depHour > f.departureEnd) return false;

    // Arrival time window
    const arrHour = last ? hourOf(last.arrival_time) : 0;
    if (arrHour < f.arrivalStart || arrHour > f.arrivalEnd) return false;

    // Avoid airlines
    if (avoidAirlines.size > 0) {
      const flightAirlines = new Set(it.legs.map((l) => l.airline.toUpperCase()));
      for (const a of avoidAirlines) {
        if (flightAirlines.has(a)) return false;
      }
    }

    // Avoid layover airports
    if (avoidAirports.size > 0) {
      for (const ap of layoverAirports(it)) {
        if (avoidAirports.has(ap)) return false;
      }
    }

    // Max layover time
    if (f.maxLayoverMinutes !== null && it.stops > 0) {
      if (totalLayoverMinutes(it) > f.maxLayoverMinutes) return false;
    }

    return true;
  });

  // Sort
  results = [...results].sort((a, b) => {
    switch (f.sortBy) {
      case "price":
        return a.price - b.price;
      case "duration":
        return a.duration_minutes - b.duration_minutes;
      case "departure": {
        const da = a.legs[0] ? new Date(a.legs[0].departure_time).getTime() : 0;
        const db = b.legs[0] ? new Date(b.legs[0].departure_time).getTime() : 0;
        return da - db;
      }
      case "arrival": {
        const aa = a.legs.at(-1) ? new Date(a.legs.at(-1)!.arrival_time).getTime() : 0;
        const ab = b.legs.at(-1) ? new Date(b.legs.at(-1)!.arrival_time).getTime() : 0;
        return aa - ab;
      }
      case "layover":
        return totalLayoverMinutes(a) - totalLayoverMinutes(b);
      default:
        return 0;
    }
  });

  return results;
}
