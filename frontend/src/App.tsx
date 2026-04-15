import { useEffect, useState } from "react";
import {
  searchFlights,
  type FlightSearchRequest,
  type FlightSearchResponse,
} from "./lib/api";
import { FlightSearchForm } from "./components/FlightSearchForm";
import { FlightResultsTable } from "./components/FlightResultsTable";

type Health = { status: string; version: string };

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<FlightSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setHealthError(String(e)));
  }, []);

  async function handleSearch(req: FlightSearchRequest) {
    setSubmitting(true);
    setError(null);
    setResponse(null);
    try {
      const res = await searchFlights(req);
      setResponse(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ fontFamily: "system-ui", padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ margin: 0 }}>trip-planner</h1>
        <small style={{ color: "#888" }}>
          {healthError
            ? `backend: error`
            : health
              ? `backend v${health.version} · ${health.status}`
              : `backend: …`}
        </small>
      </header>
      <p style={{ color: "#555" }}>
        Flight search via <code>fli</code> (Google Flights). Cross-source, hotels, and points
        math coming in later increments.
      </p>

      <section style={{ marginTop: 16 }}>
        <FlightSearchForm onSubmit={handleSearch} submitting={submitting} />
      </section>

      {error && (
        <pre style={{ color: "crimson", whiteSpace: "pre-wrap", marginTop: 16 }}>{error}</pre>
      )}

      {response && (
        <>
          {response.warnings.length > 0 && (
            <ul style={{ color: "#b45309", marginTop: 16 }}>
              {response.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          <FlightResultsTable title="Outbound" itineraries={response.outbound} />
          {response.ret && (
            <FlightResultsTable title="Return" itineraries={response.ret} />
          )}
        </>
      )}
    </main>
  );
}
