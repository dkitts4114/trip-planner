import { useState } from "react";
import type {
  CabinClass,
  FlightSearchRequest,
  MaxStopsOption,
  SortOption,
} from "../lib/api";

interface Props {
  defaultOrigin?: string;
  onSubmit: (req: FlightSearchRequest) => void;
  submitting: boolean;
}

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function FlightSearchForm({ defaultOrigin = "SFO", onSubmit, submitting }: Props) {
  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState("PHX");
  const [departureDate, setDepartureDate] = useState(todayPlus(30));
  const [roundTrip, setRoundTrip] = useState(false);
  const [returnDate, setReturnDate] = useState(todayPlus(37));
  const [adults, setAdults] = useState(1);
  const [cabin, setCabin] = useState<CabinClass>("economy");
  const [maxStops, setMaxStops] = useState<MaxStopsOption>("any");
  const [sortBy, setSortBy] = useState<SortOption>("cheapest");

  function handle(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      origin: origin.trim().toUpperCase(),
      destination: destination.trim().toUpperCase(),
      departure_date: departureDate,
      return_date: roundTrip ? returnDate : null,
      adults,
      cabin,
      max_stops: maxStops,
      sort_by: sortBy,
    });
  }

  const row: React.CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" };
  const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
  const label: React.CSSProperties = { fontSize: 12, color: "#555" };
  const input: React.CSSProperties = { padding: 6, fontSize: 14, minWidth: 80 };

  return (
    <form onSubmit={handle} style={{ display: "grid", gap: 12 }}>
      <div style={row}>
        <div style={field}>
          <label style={label}>From (IATA)</label>
          <input
            style={{ ...input, textTransform: "uppercase" }}
            maxLength={3}
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            required
          />
        </div>
        <div style={field}>
          <label style={label}>To (IATA)</label>
          <input
            style={{ ...input, textTransform: "uppercase" }}
            maxLength={3}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
          />
        </div>
        <div style={field}>
          <label style={label}>Departure</label>
          <input
            style={input}
            type="date"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            required
          />
        </div>
        <div style={field}>
          <label style={label}>
            <input
              type="checkbox"
              checked={roundTrip}
              onChange={(e) => setRoundTrip(e.target.checked)}
            />{" "}
            Round-trip
          </label>
          <input
            style={{ ...input, opacity: roundTrip ? 1 : 0.4 }}
            type="date"
            value={returnDate}
            disabled={!roundTrip}
            onChange={(e) => setReturnDate(e.target.value)}
          />
        </div>
      </div>

      <div style={row}>
        <div style={field}>
          <label style={label}>Adults</label>
          <input
            style={input}
            type="number"
            min={1}
            max={9}
            value={adults}
            onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
          />
        </div>
        <div style={field}>
          <label style={label}>Cabin</label>
          <select
            style={input}
            value={cabin}
            onChange={(e) => setCabin(e.target.value as CabinClass)}
          >
            <option value="economy">Economy</option>
            <option value="premium_economy">Premium Economy</option>
            <option value="business">Business</option>
            <option value="first">First</option>
          </select>
        </div>
        <div style={field}>
          <label style={label}>Max stops</label>
          <select
            style={input}
            value={maxStops}
            onChange={(e) => setMaxStops(e.target.value as MaxStopsOption)}
          >
            <option value="any">Any</option>
            <option value="non_stop">Non-stop</option>
            <option value="one_stop">≤ 1 stop</option>
            <option value="two_plus">≥ 2 stops ok</option>
          </select>
        </div>
        <div style={field}>
          <label style={label}>Sort</label>
          <select
            style={input}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="cheapest">Cheapest</option>
            <option value="fastest">Fastest</option>
            <option value="departure">Departure time</option>
            <option value="arrival">Arrival time</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 600,
            background: submitting ? "#aaa" : "#2563eb",
            color: "white",
            border: 0,
            borderRadius: 4,
            cursor: submitting ? "default" : "pointer",
          }}
        >
          {submitting ? "Searching…" : "Search"}
        </button>
      </div>
    </form>
  );
}
