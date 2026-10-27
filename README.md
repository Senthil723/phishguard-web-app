# PhishGuard

PhishGuard is organized as a separate React frontend and FastAPI backend:

```text
phishguard/
├── frontend/       # React, Vite, and Tailwind CSS
├── backend/        # FastAPI, SQLAlchemy, and MySQL
└── README.md
```

## Backend setup

Requirements: Python 3.10+ and a running MySQL server.

1. Create a MySQL database and user for the app:

   ```sql
   CREATE DATABASE phishguard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'phishguard'@'localhost' IDENTIFIED BY 'change-me';
   GRANT ALL PRIVILEGES ON phishguard.* TO 'phishguard'@'localhost';
   ```

2. In `backend/`, create a virtual environment, install dependencies, and configure the database:

   ```powershell
   cd backend
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   Copy-Item .env.example .env
   ```

   Update `DATABASE_URL` in `.env` with the MySQL credentials you created.

3. Start the API from `backend/`:

   ```powershell
   uvicorn app.main:app --reload
   ```

   API docs are available at `http://localhost:8000/docs`.

## API endpoints

- `GET /api/v1/health` — API status
- `GET /api/v1/health/database` — database connectivity
- `POST /api/v1/scans` — validate an HTTP(S) URL and store a scan-history record
- `GET /api/v1/scans?limit=20` — list recent records (limit 1–100)
- `GET /api/v1/scans/{scan_id}` — retrieve one record

The scan API currently performs URL format validation only. It does not visit
the submitted URL or detect phishing or malware. Records use the
`not_analyzed` status until a detection service is implemented.

## Frontend

```powershell
npm install
npm run dev
```

The React app is in `frontend/` and runs at `http://localhost:5173`. The API is
scaffolded separately; the existing frontend scan flow is not yet connected to
the backend.
