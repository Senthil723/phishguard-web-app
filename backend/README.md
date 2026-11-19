# PhishGuard backend

The FastAPI backend authenticates users, stores their scans, runs a local URL-feature model, and returns per-user analytics. See the [project README](../README.md) for setup and API routes.

SQLite is the default. Copy `.env.example` to `.env`; set `DATABASE_URL` to a MySQL URL if needed. Startup creates new tables and upgrades the nullable columns of an older `scans` table without deleting its rows.

Run tests with `.\.venv\Scripts\python.exe -m unittest discover -s tests -v` from this directory. Run `python -m scripts.evaluate_release_model` to regenerate the held-out model report.

The model uses URL text features only. It does not open submitted links or inspect their content. Its score is experimental and must not be treated as proof of safety.
