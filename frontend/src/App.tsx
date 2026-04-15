import { useEffect, useState } from "react";

type Health = { status: string; version: string };

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui", padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1>trip-planner</h1>
      <p>Personal automated trip-planning tool. v1 in progress.</p>
      <section>
        <h2>Backend status</h2>
        {error && <pre style={{ color: "crimson" }}>Error: {error}</pre>}
        {health ? (
          <p>
            ✅ <code>{health.status}</code> — version <code>{health.version}</code>
          </p>
        ) : (
          !error && <p>Checking…</p>
        )}
      </section>
    </main>
  );
}
