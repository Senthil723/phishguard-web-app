# PhishGuard backend

The FastAPI backend authenticates users, stores their scans, runs a local URL-feature model, and returns per-user analytics. See the [project README](../README.md) for setup and API routes.

SQLite is the default. Copy `.env.example` to `.env`. Startup creates new tables and upgrades the nullable columns of an older `scans` table without deleting its rows.

## Move existing data to MySQL

1. Back up `phishguard.db` and stop the API so no new records arrive during the copy. Keep `DATABASE_URL` pointing to SQLite for now.
2. Install MySQL 8, create an empty UTF-8 database and a dedicated account (replace the password):

   ```sql
   CREATE DATABASE phishguard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'phishguard'@'localhost' IDENTIFIED BY 'YOUR_PASSWORD';
   GRANT ALL PRIVILEGES ON phishguard.* TO 'phishguard'@'localhost';
   ```

3. Set `MYSQL_DATABASE_URL=mysql+pymysql://phishguard:YOUR_PASSWORD@localhost:3306/phishguard?charset=utf8mb4` in `backend/.env`. Percent-encode any special characters in the password.
4. From `backend/`, run `.\.venv\Scripts\python.exe -m scripts.migrate_sqlite_to_mysql`. It copies users, sessions, and scans with their IDs, checks row counts, and leaves SQLite untouched. The MySQL database must have no PhishGuard tables.
5. Once counts match, change `DATABASE_URL` in `.env` to the same MySQL URL and start the API. Check login, scan history, and reports before accepting new submissions. Keep the SQLite backup until the cutover is verified.

For a fresh installation with no SQLite data to preserve, set `DATABASE_URL` directly to the MySQL URL; startup creates the tables.

## Password reset email

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `SMTP_FROM_EMAIL` in `backend/.env`. Use `SMTP_PORT=587` with STARTTLS (the default), or `SMTP_PORT=465` and `SMTP_USE_SSL=true` for implicit TLS. Set `PASSWORD_RESET_FRONTEND_URL` to the public frontend origin, such as `https://your-site.example`. Restart the backend after changing `.env`. If SMTP is not configured, the reset request route returns 503.

The login page links to `/forgot-password`. An account owner receives a 30-minute, single-use reset link by email. The request response is the same whether or not an account exists, and repeat emails for an account are limited to one every five minutes. A successful reset revokes that account's existing sessions. Keep SMTP credentials only in `.env`, never in source control.

Run tests with `.\.venv\Scripts\python.exe -m unittest discover -s tests -v` from this directory. Run `python -m scripts.evaluate_release_model` to regenerate the held-out model report.

The model uses URL text features only. It does not open submitted links or inspect their content. Its score is experimental and must not be treated as proof of safety.
