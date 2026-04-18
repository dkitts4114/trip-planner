import type { FlightItinerary, SourceResult } from "../lib/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Source badge
// ---------------------------------------------------------------------------

const SOURCE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  fli: { bg: "#e8f4fd", color: "#1565c0", label: "Google Flights (fli)" },
  amadeus: { bg: "#fdf3e8", color: "#b05c00", label: "Amadeus" },
};

function SourceBadge({ source }: { source: string }) {
  const style = SOURCE_STYLES[source] ?? { bg: "#f0f0f0", color: "#444", label: source };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
        background: style.bg,
        color: style.color,
        marginLeft: 8,
        verticalAlign: "middle",
      }}
    >
      {style.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Result table
// ---------------------------------------------------------------------------

interface TableProps {
  itineraries: FlightItinerary[];
  source: string;
  title: string;
}

export function FlightResultsTable({ itineraries, source, title }: TableProps) {
  if (itineraries.length === 0) {
    return (
      <section style={{ marginTop: 16 }}>
        <h3 style={{ margin: "0 0 6px" }}>
          {title}
          <SourceBadge source={source} />
        </h3>
        <p style={{ color: "#888", margin: 0 }}>No results.</p>
      </section>
    );
  }
  return (
    <section style={{ marginTop: 16 }}>
      <h3 style={{ margin: "0 0 6px" }}>
        {title}
        <SourceBadge source={source} />
      </h3>
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

// ---------------------------------------------------------------------------
// Source panel — wraps a SourceResult with its header, warnings, and table(s)
// ---------------------------------------------------------------------------

interface PanelProps {
  source: "fli" | "amadeus";
  result: SourceResult;
  isRoundTrip: boolean;
}

export function SourcePanel({ source, result, isRoundTrip }: PanelProps) {
  const style = SOURCE_STYLES[source] ?? { bg: "#f0f0f0", color: "#444", label: source };

  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        border: `1px solid ${style.bg}`,
        borderRadius: 8,
        padding: "16px 20px",
        background: "#fafafa",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>
          {style.label}
        </h2>
        {!result.available && (
          <span
            style={{
              marginLeft: 10,
              fontSize: 12,
              color: "#c62828",
              background: "#ffebee",
              padding: "2px 8px",
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            Unavailable
          </span>
        )}
      </div>

      {result.warnings.length > 0 && (
        <ul style={{ margin: "0 0 8px", paddingLeft: 20, color: "#b05c00", fontSize: 13 }}>
          {result.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      <FlightResultsTable
        title="Outbound"
        source={source}
        itineraries={result.outbound}
      />

      {isRoundTrip && (
        <FlightResultsTable
          title="Return"
          source={source}
          itineraries={result.ret ?? []}
        />
      )}
    </div>
  );
}
