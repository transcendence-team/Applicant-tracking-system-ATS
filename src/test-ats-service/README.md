# ATS service test frontend

A local, buildless test interface. Its files all live in `src/test-ats-service`. Nginx serves the directory via a read-only mount. Requests use the existing same-origin auth and ATS routes; no CORS setup or manual token copying is needed.

From the project root in WSL:

```bash
docker compose up --build -d ats-api nginx
```

Open **https://localhost/test-ats-service/** in Chrome. Accept the project's local certificate if prompted.

1. Click **Check API connection**.
2. Sign in with an existing HR/admin account to create, view, edit, and delete postings. Jobs default to OPEN so they appear on the public board.
3. Click **Edit** on a posting to load it into the form. Draft, closed, and archived postings are excluded by the public API; keep their IDs and use the form to update/delete them. For manual ID updates, the form sends all displayed values, so fill all fields you want to keep.
4. Sign out and use an applicant account to upload a PDF. **Create applicant account** registers the entered email/password, after which you can sign in. Real parsing requires M3's worker; worker failures appear in the response inspector.

The response inspector displays HTTP status and JSON, with tokens redacted. Login tokens remain in memory and disappear on refresh. Requests modify your real development database. Deletion requires confirmation; jobs with applications must be archived instead.

No npm install or frontend build is required. Changes to these static files are visible after refreshing Chrome. Changes to `src/nginx/nginx.conf` require rebuilding/recreating Nginx.
