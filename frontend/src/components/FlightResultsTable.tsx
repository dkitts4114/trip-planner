import type { FlightItinerary } from "../lib/api";

interface Props {
  title: string;
  itineraries: FlightItinerary[];
}

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function FlightResultsTable({ title, itineraries }: Props) {
  if (itineraries.length === 0) {
    return (
      <section style={{ marginTop: 16 }}>
        <h3>{title}</h3>
        <p style={{ color: "#666" }}>No results.</p>
      </section>
    );
  }
  return (
    <section style={{ marginTop: 16 }}>
      <h3>{title}</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
            <th style={{ padding: "6px 4px" }}>Price</th>
            <th style={{ padding: "6px 4px" }}>Airline(s)</th>
            <th style={{ padding: "6px 4px" }}>Depart</th>
            <th style={{ padding: "6px 4px" }}>Arrive</th>
            <th style={{ padding: "6px 4px" }}>Stops</th>
            <th style={{ padding: "6px 4px" }}>Duration</th>
          </tr>
        </thead>
        <tbody>
          {itineraries.map((it, i) => {
            const first = it.legs[0];
            const last = it.legs[it.legs.length - 1];
            const airlines = Array.from(new Set(it.legs.map((l) => l.airline))).join(" / ");
            return (
              <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "6px 4px", fontWeight: 600 }}>
                  {it.currency === "USD" ? "$" : ""}
                  {it.price.toFixed(0)}
                </td>
                <td style={{ padding: "6px 4px" }}>{airlines}</td>
                <td style={{ padding: "6px 4px" }}>
                  {first ? fmtTime(first.departure_time) : "—"}
                </td>
                <td style={{ padding: "6px 4px" }}>
                  {last ? fmtTime(last.arrival_time) : "—"}
                </td>
                <td style={{ padding: "6px 4px" }}>{it.stops}</td>
                <td style={{ padding: "6px 4px" }}>{fmtDuration(it.duration_minutes)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
