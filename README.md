# PhishGuard

PhishGuard is a React and FastAPI project for saving and assessing HTTP(S) URLs. An experimental local Random Forest model scores URL features; it does not visit websites, inspect page content, or guarantee that a link is safe.

## What works

- Account registration, login, remember-me sessions, and logout
- Per-user URL scans with model prediction, score, risk level, and history
- Dashboard statistics and date-range reports with CSV export
- SQLite for local development, with a documented transfer to MySQL

## Run locally

Use Python 3.10+, Git LFS for the bundled model, and Node.js compatible with the version of Vite in `frontend/package.json`. Run `git lfs pull` after cloning if the model file is only a pointer.

From `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

From a second terminal in `frontend/`:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`. Use `localhost` for both the frontend and API in local configuration so login cookies work. The API docs are at `http://localhost:8000/docs`.

The backend creates new tables and upgrades legacy scan columns on startup. Existing scans without a user remain unassigned; they are not shown in another account's history.

To move existing accounts and scans into MySQL, follow the [backend transfer steps](backend/README.md#move-existing-data-to-mysql) before changing `DATABASE_URL`.

## Verify

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

```powershell
cd frontend
npm run lint
npm run build
```

To reproduce the shipped model's held-out test report, run `python -m scripts.evaluate_release_model` from `backend/`. It reads `backend/data/processed/url_test.csv` and writes `backend/models/url_model_release_evaluation.json`.

The checked-in [evaluation report](backend/models/url_model_release_evaluation.json) records 97.2% precision and 78.4% recall for the high-risk label on 69,204 held-out URLs. It also records 1,623 phishing URLs in the low-risk group. These test-set results are not a guarantee for new websites.

## API

All routes below are under `/api/v1`. Scan routes require a valid session cookie.

| Route | Purpose |
| --- | --- |
| `POST /auth/register` | Create an account |
| `POST /auth/login` | Start a session |
| `GET /auth/me` | Verify the current session |
| `POST /auth/logout` | Revoke the current session |
| `POST /scans` | Assess and save a URL |
| `GET /scans?limit=20&offset=0` | List the current user's scans |
| `GET /scans/{id}` | Get one of the current user's scans |
| `GET /scans/stats` | Get current-user totals |
| `GET /scans/analytics` | Get current-user status and daily counts for an optional UTC date range |

## Release notes

Set `DATABASE_URL`, `FRONTEND_ORIGINS`, and `SESSION_COOKIE_SECURE=true` for an HTTPS deployment. Keep `.env` and live databases out of published source. Put rate limits on account registration, login, and scan submission at the deployment gateway. The bundled model is stored with Git LFS; verify that the deployment fetches it before starting the API.
