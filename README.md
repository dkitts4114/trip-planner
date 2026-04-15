# trip-planner

Personal automated trip-planning tool.

Primary data sources: [punitarani/fli](https://github.com/punitarani/fli) for Google Flights, Amadeus Self-Service API (free tier) for cross-check and hotels. Points math is built in over the top.

## Stack

- **Backend:** FastAPI (Python 3.10+), managed with `uv` or `pip`
- **Frontend:** Vite + React + TypeScript
- **Flight data:** `fli` (Python library)
- **Hotel data + flight cross-check:** Amadeus Self-Service (free tier, `amadeus` Python SDK)
- **Storage:** local JSON profile at `~/.trip-planner/profile.json`

## Quickstart

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env     # fill in AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET
uvicorn trip_planner.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173
```

## Increments (v1 roadmap)

0. [x] Project scaffold
1. [ ] Flight search via `fli`
2. [ ] Amadeus cross-check
3. [ ] Saved profile
4. [ ] CPP points strategy engine
5. [ ] Hotel search + Hyatt chart
6. [ ] Best-time-to-visit + price calendar
7. [ ] Deal / error-fare alerts
8. [ ] Final integration + v1.0.0

Each increment ships as its own commit only after tests pass and the feature is manually verified end-to-end.

## Scope (v1)

- Search + plan only. Tool surfaces best options and redemption strategy; user books manually on portals/airlines.
- Deferred to v2: multi-leg trip builder (positioning / open-jaw / stopovers), award-seat search (requires seats.aero Pro).

## License

MIT
