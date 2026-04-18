import { describe, it, expect } from "vitest";
import { applyFilters, DEFAULT_FILTERS } from "./filterFlights";
import type { FlightItinerary } from "./api";

function makeIt(overrides: Partial<FlightItinerary> = {}): FlightItinerary {
  return {
    direction: "outbound",
    price: 150,
    currency: "USD",
    duration_minutes: 130,
    stops: 0,
    legs: [
      {
        airline: "UA",
        flight_number: "UA100",
        origin: "SFO",
        destination: "PHX",
        departure_time: "2026-05-20T08:00:00",
        arrival_time: "2026-05-20T10:10:00",
        duration_minutes: 130,
      },
    ],
    ...overrides,
  };
}

function makeConnecting(
  layoverAirport = "DEN",
  layoverMinutes = 90,
  airline = "UA"
): FlightItinerary {
  // First leg arrives at 10:00. Build departure string arithmetically so there
  // are no Date-to-UTC conversions that differ by timezone.
  const baseHour = 10;
  const totalMin = baseHour * 60 + layoverMinutes;
  const depHour = Math.floor(totalMin / 60);
  const depMin = totalMin % 60;
  const dep2Str = `2026-05-20T${String(depHour).padStart(2, "0")}:${String(depMin).padStart(2, "0")}:00`;

  return {
    direction: "outbound",
    price: 120,
    currency: "USD",
    duration_minutes: 180 + layoverMinutes + 120,
    stops: 1,
    legs: [
      {
        airline,
        flight_number: `${airline}100`,
        origin: "SFO",
        destination: layoverAirport,
        departure_time: "2026-05-20T07:00:00",
        arrival_time: "2026-05-20T10:00:00",
        duration_minutes: 180,
      },
      {
        airline,
        flight_number: `${airline}200`,
        origin: layoverAirport,
        destination: "MCO",
        departure_time: dep2Str,
        arrival_time: "2026-05-20T22:00:00",
        duration_minutes: 120,
      },
    ],
  };
}

describe("applyFilters", () => {
  it("returns all results with default filters", () => {
    const its = [makeIt(), makeIt({ price: 200 })];
    expect(applyFilters(its, DEFAULT_FILTERS)).toHaveLength(2);
  });

  it("sorts by price ascending", () => {
    const its = [makeIt({ price: 300 }), makeIt({ price: 100 }), makeIt({ price: 200 })];
    const result = applyFilters(its, { ...DEFAULT_FILTERS, sortBy: "price" });
    expect(result.map((r) => r.price)).toEqual([100, 200, 300]);
  });

  it("sorts by duration ascending", () => {
    const its = [makeIt({ duration_minutes: 300 }), makeIt({ duration_minutes: 100 })];
    const result = applyFilters(its, { ...DEFAULT_FILTERS, sortBy: "duration" });
    expect(result[0].duration_minutes).toBe(100);
  });

  it("filters out flights outside departure time window", () => {
    const morning = makeIt(); // departs 08:00
    const evening = makeIt({
      legs: [
        {
          ...makeIt().legs[0],
          departure_time: "2026-05-20T20:00:00",
          arrival_time: "2026-05-20T22:00:00",
        },
      ],
    });
    const result = applyFilters([morning, evening], {
      ...DEFAULT_FILTERS,
      departureStart: 6,
      departureEnd: 12,
    });
    expect(result).toHaveLength(1);
    expect(result[0].legs[0].departure_time).toContain("08:00");
  });

  it("filters out avoided airlines", () => {
    const ua = makeIt();
    const aa = makeIt({ legs: [{ ...makeIt().legs[0], airline: "AA" }] });
    const result = applyFilters([ua, aa], {
      ...DEFAULT_FILTERS,
      avoidAirlines: ["AA"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].legs[0].airline).toBe("UA");
  });

  it("filters out avoided layover airports", () => {
    const viaDen = makeConnecting("DEN");
    const viaOrd = makeConnecting("ORD");
    const result = applyFilters([viaDen, viaOrd], {
      ...DEFAULT_FILTERS,
      avoidLayoverAirports: ["DEN"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].legs[0].destination).toBe("ORD");
  });

  it("filters by max layover time", () => {
    // short: 30-min layover — arrives 10:00, second leg departs 10:30
    const short = makeConnecting("DEN", 30);
    // long: 360-min layover — arrives 10:00, second leg departs 16:00
    const long = makeConnecting("ORD", 360);
    const result = applyFilters([short, long], {
      ...DEFAULT_FILTERS,
      maxLayoverMinutes: 120, // 30 passes, 360 does not
    });
    expect(result).toHaveLength(1);
    // the surviving itinerary should be the DEN one (30-min layover)
    expect(result[0].legs[0].destination).toBe("DEN");
  });
});
