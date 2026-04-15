# backend

FastAPI backend for trip-planner.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn trip_planner.main:app --reload --port 8000
```

Run tests:

```bash
pytest
```

Lint:

```bash
ruff check .
ruff format .
```
