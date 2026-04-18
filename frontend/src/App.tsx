import { useEffect, useState } from "react";
import {
  searchFlights,
  type FlightSearchRequest,
  type FlightSearchResponse,
} from "./lib/api";
import { applyFilters, DEFAULT_FILTERS, type FlightFilters } from "./lib/filterFlights";
import { useProfile } from "./hooks/useProfile";
import { FlightSearchForm } from "./components/FlightSearchForm";
import { FlightResultsTable } from "./components/FlightResultsTable";
import { Sidebar, type SidebarTab } from "./components/Sidebar";

type Health = { status: string; version: string };

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const { profile, setProfile, resetProfile } = useProfile();

  const [filters, setFiltersState] = useState<FlightFilters>({ ...DEFAULT_FILTERS });
  const setFilters = (patch: Partial<FlightFilters>) =>
    setFiltersState((prev) => ({ ...prev, ...patch }));
  const resetFilters = () => setFiltersState({ ...DEFAULT_FILTERS });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<SidebarTab>("profile");

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

  // Apply client-side filters to the raw response
  const outbound = response ? applyFilters(response.outbound, filters) : null;
  const ret = response?.ret ? applyFilters(response.ret, filters) : null;
  const totalFiltered = (outbound?.length ?? 0) + (ret?.length ?? 0);
  const totalRaw = (response?.outbound.length ?? 0) + (response?.ret?.length ?? 0);

  const SIDEBAR_WIDTH = 260;
  const mainMargin = sidebarOpen ? SIDEBAR_WIDTH : 0;

  return (
    <>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        profile={profile}
        setProfile={setProfile}
        onResetProfile={resetProfile}
        filters={filters}
        setFilters={setFilters}
        onResetFilters={resetFilters}
        resultCount={response ? totalFiltered : null}
      />

      <main
        style={{
          fontFamily: "system-ui",
          padding: "24px 28px",
          maxWidth: 1100,
          marginLeft: mainMargin,
          transition: "margin-left 0.22s ease",
        }}
      >
        {/* Header */}
        <header
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              title="Toggle settings"
              style={{
                background: "none",
                border: "1px solid #d1d5db",
                borderRadius: 5,
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: 16,
                color: "#374151",
              }}
            >
              ☰
            </button>
            <h1 style={{ margin: 0, fontSize: 22 }}>trip-planner</h1>
          </div>
          <small style={{ color: "#9ca3af" }}>
            {healthError
              ? "backend: error"
              : health
                ? `backend v${health.version} · ${health.status}`
                : "backend: …"}
          </small>
        </header>

        <p style={{ color: "#6b7280", margin: "0 0 20px", fontSize: 13 }}>
          Flight search via <strong>Google Flights</strong>. Calendar integration, points math, and
          hotel lookup coming in later increments.
        </p>

        {/* Search form — pre-filled from profile */}
        <FlightSearchForm
          onSubmit={handleSearch}
          submitting={submitting}
          defaultOrigin={profile.homeAirport}
          defaultAdults={profile.defaultAdults}
          defaultCabin={profile.defaultCabin}
          defaultMaxStops={profile.defaultMaxStops}
        />

        {error && (
          <pre style={{ color: "crimson", whiteSpace: "pre-wrap", marginTop: 16 }}>{error}</pre>
        )}

        {/* Results */}
        {response && (
          <div style={{ marginTop: 20 }}>
            {/* Result summary bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 4,
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              <span>
                Showing <strong>{totalFiltered}</strong> of {totalRaw} results
                {filters.sortBy !== "price" && (
                  <span>
                    {" · "}sorted by{" "}
                    <strong>
                      {filters.sortBy === "duration"
                        ? "total flight time"
                        : filters.sortBy === "layover"
                          ? "layover time"
                          : filters.sortBy}
                    </strong>
                  </span>
                )}
              </span>
              {totalFiltered < totalRaw && (
                <button
                  onClick={() => {
                    setActiveTab("filters");
                    setSidebarOpen(true);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    cursor: "pointer",
                    fontSize: 12,
                    padding: 0,
                  }}
                >
                  {totalRaw - totalFiltered} hidden by filters →
                </button>
              )}
            </div>

            {response.warnings.length > 0 && (
              <ul style={{ color: "#b45309", margin: "8px 0", paddingLeft: 20, fontSize: 13 }}>
                {response.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}

            <FlightResultsTable title="Outbound" itineraries={outbound ?? []} />
            {ret && ret.length > 0 && (
              <FlightResultsTable title="Return" itineraries={ret} />
            )}
          </div>
        )}
      </main>
    </>
  );
}
