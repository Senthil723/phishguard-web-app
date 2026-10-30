# PhishGuard Backend

A starter API built with FastAPI and SQLAlchemy. It currently saves URL submissions and provides scan history. **It does not classify URLs as phishing or legitimate yet.** New records are saved with `status: "not_analyzed"`.

## Requirements

- Python 3.10+
- Windows PowerShell or a terminal
- No MySQL installation is needed for the default SQLite setup

## Setup on Windows

From the folder that contains `app/` and `requirements.txt`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

If PowerShell blocks activation, you can run the environment's Python directly instead:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

## Try the API

- API root: http://127.0.0.1:8000/
- Interactive API docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/api/v1/health
- Database health: http://127.0.0.1:8000/api/v1/health/database
- Scan statistics: `GET /api/v1/scans/stats`

In `/docs`, use `POST /api/v1/scans` with:

```json
{
  "url": "https://example.com"
}
```

Then use `GET /api/v1/scans` to view saved submissions.

The statistics endpoint returns database-wide totals for submitted,
pending, completed, failed, and unrecognized statuses, along with counts
for each stored status value. `pending` includes `not_analyzed`, `pending`,
`queued`, `running`, `processing`, and `in_progress`; completed includes
`analyzed`, `analysed`, and `completed`; failed includes `failed` and
`error`. Other status values are counted as unrecognized, not pending.
These statuses describe database records only and are not phishing verdicts.

## Database

SQLite is the default for simple local development. To use MySQL, install and start MySQL, create a database, then set `DATABASE_URL` in `.env`, for example:

```env
DATABASE_URL=mysql+pymysql://phishguard:YOUR_PASSWORD@localhost:3306/phishguard
FRONTEND_ORIGINS=http://localhost:5173
```

Replace the placeholder with your local credentials. Never commit `.env` or real credentials to GitHub.

## Important security notes

- Do not automatically fetch or open submitted URLs from this API.
- CORS is not authentication.
- Add authentication and per-user authorization before storing private user scan history.
- Add rate limiting before public deployment.
- Connect and evaluate a trained ML model before presenting a prediction as a real detection result.
