# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Changed (Increment 1 — flight search, post-verify)
- Flat package layout (`backend/trip_planner/...`) — dropped src-layout after repeated editable-install friction on Python 3.14.
- `_stops_to_fli` resolves fli's `MaxStops` members via a fallback chain so it tolerates the real names (`ONE_STOP_OR_FEWER`, `TWO_OR_FEWER_STOPS`) without requiring fli in tests.
- Verified live: `POST /api/flights/search` against Google Flights via fli returned 14 SFO→PHX nonstops starting at $118 (2026-05-20).

### Added (Increment 1 — flight search)
- Domain models for flight search (`FlightSearchRequest`, `FlightItinerary`, `FlightLeg`, enums for cabin / max stops / sort).
- Service wrapper around `punitarani/fli` (`services/flight_search.py`) that translates our domain into fli filters and back, with an injectable searcher for testability.
- `POST /api/flights/search` endpoint supporting one-way and round-trip; 502 on upstream failure; surfaces "no results" warnings.
- Backend tests: service unit tests + endpoint tests with injected fakes; fli is stubbed in conftest so tests run offline. 8/8 passing.
- Frontend: typed API client, `FlightSearchForm` + `FlightResultsTable` components, end-to-end flow in `App`. Vitest coverage for load + search happy path.

### Added (Increment 0 — scaffold)
- FastAPI backend skeleton with `/api/health`, Pydantic settings, `.env.example` for Amadeus credentials, pytest smoke test.
- Vite + React + TypeScript frontend scaffold, proxying `/api` to `:8000`, Vitest + Testing Library set up.
- README with v1 roadmap, MIT LICENSE, `.gitignore` (excludes `.env`, `node_modules/`, `.trip-planner/`).
