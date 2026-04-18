import { useEffect, useState } from "react";
import {
  searchFlights,
  type FlightSearchRequest,
  type FlightSearchResponse,
} from "./lib/api";
import { FlightSearchForm } from "./components/FlightSearchForm";
import { SourcePanel } from "./components/FlightResultsTable";

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

  const isRoundTrip = Boolean(response?.request?.return_date);

  return (
    <main style={{ fontFamily: "system-ui", padding: 24, maxWidth: 1280, margin: "0 auto" }}>
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
      <p style={{ color: "#555", marginTop: 6 }}>
        Flight search via <strong>Google Flights (fli)</strong> and <strong>Amadeus</strong> side-by-side.
        Points math, hotel lookup, and deal alerts coming in later increments.
      </p>

      <section style={{ marginTop: 16 }}>
        <FlightSearchForm onSubmit={handleSearch} submitting={submitting} />
      </section>

      {error && (
        <pre style={{ color: "crimson", whiteSpace: "pre-wrap", marginTop: 16 }}>{error}</pre>
      )}

      {response && (
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 24,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <SourcePanel source="fli" result={response.fli} isRoundTrip={isRoundTrip} />
          <SourcePanel source="amadeus" result={response.amadeus} isRoundTrip={isRoundTrip} />
        </div>
      )}
    </main>
  );
}
