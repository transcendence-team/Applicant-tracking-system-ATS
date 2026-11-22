# ATS API — tickets 4 and 5

For the backend feature summary and candidate profile/application API contracts, see [ATS_SERVICE_FEATURES.md](./ATS_SERVICE_FEATURES.md).

Express API. The database schema, migrations and generated Prisma client remain owned by `src/postgres/ats-db`; this service imports that client without copying the schema.

From the repository root:

```bash
docker compose --profile database run --build --rm ats-db-tools
docker compose up --build -d ats-api nginx
curl -k https://localhost/api/ats/health
```

The health endpoint checks PostgreSQL. Compose runs the FastAPI PDF parser on `backend_net`. The parser requires a PDF with an extractable text layer.

The follow-up ATS migration backfills résumé and application user UUIDs from the old candidate profiles. On older databases it keeps the original candidate and employee profile rows in `ats_legacy_profiles` for a separate import into Auth. Auth's `users` table is the live source of profile fields.

## Jobs

| Method | Route | Access |
| --- | --- | --- |
| GET | `/api/ats/jobs?page=1&limit=20` | Public; OPEN jobs only |
| GET | `/api/ats/jobs/:id` | Public; OPEN jobs only |
| POST | `/api/ats/jobs` | HR/admin |
| PATCH | `/api/ats/jobs/:id` | HR creator or admin |
| DELETE | `/api/ats/jobs/:id` | HR creator or admin |

Writes require `Authorization: Bearer <accessToken>` from the Spring login endpoint. JWT subjects must be UUIDs. The middleware verifies RS256 signatures using `JWT_PUBLIC_KEY` and requires an expiration claim.

Example (set TOKEN to an HR/admin accessToken):

```bash
curl -k https://localhost/api/ats/jobs \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Backend Engineer","description":"Build ATS services","employmentType":"FULL_TIME","status":"OPEN","salaryMin":30000,"salaryMax":50000}'
```

`title` is required on creation. Optional fields: `description`, `location`, `employmentType`, `status`, `salaryMin`, `salaryMax`, `publishedAt`, `deadline`. Dates use ISO 8601 timestamps with a timezone. Default status is DRAFT. Unknown fields are rejected; `createdBy` always comes from the token. Public reads intentionally exclude drafts, closed and archived jobs. POST/PATCH responses include the saved record, including drafts.

PATCH accepts a nonempty subset of these fields. Delete returns 204. Jobs with applications return 409; set `status` to `ARCHIVED` instead to preserve candidate history. Missing records return 404. All errors use `{ "error": "CODE", "message": "Description" }`.

## Resume upload and M3 contract

```bash
curl -k https://localhost/api/ats/resumes \
  -H "Authorization: Bearer $CANDIDATE_TOKEN" \
  -F 'file=@/path/to/resume.pdf;type=application/pdf'
```

Only ROLE_APPLICANT may upload. Exactly one multipart field named `file`, no extra fields, maximum 10 MiB. The API checks extension, MIME type and PDF header; parsing remains the worker's responsibility. Files are stored with random names in the private `resume_data` volume and are not served publicly.

The API sends multipart `file` to `AI_PARSE_URL` (default `http://ai-worker:8000/parse`) and forwards the candidate Bearer token. `AI_TIMEOUT_MS` defaults to 60000 (maximum 300000). The worker must accept that token or leave internal authentication to the Docker network.

The bundled worker returns:

```json
{
  "rawText": "Extracted resume text...",
  "parserVersion": "pypdf-v1"
}
```

Nonempty `rawText` is required and `parserVersion` is optional.

After parsing succeeds, a transaction creates the resume metadata/hash linked to the JWT `sub` (`userId`) and a COMPLETED extraction with its text. Response: 201 with `{ resume }`. No application or job matching record is created by this endpoint. Worker failures return 502, timeouts 504, and invalid uploads 400/413/415. Database failure rolls back records and removes the new PDF. A process crash between file creation and commit can leave an orphan file; periodic cleanup is a future operational task.

## Tests

For the complete authentication-to-application integration smoke test, run from
the repository root with the local stack running:

```bash
docker compose build ats-api
docker compose run --rm --no-deps ats-api npx tsx test/backend.e2e.js
```

This creates uniquely named applicant and HR accounts through the auth API,
using the configured `ADMIN_EMAIL`/`ADMIN_PASSWORD` to provision HR. It checks
real Spring JWTs, profiles, job CRUD, permissions, applications, duplicates and
password changes. ATS test records and temporary upload files are removed;
test auth accounts remain with randomly generated passwords. Use a local test
database. The upload uses the configured FastAPI worker, PostgreSQL, and
temporary file storage.

```bash
cd src/ats-service
npm ci
npm test
```

Tests use an isolated HTTP server, temporary upload directories, and mocked Prisma/worker boundaries. They cover JWT/roles, job CRUD/validation/ownership, deletion with applications, PDF validation, file limits, transactional upload calls, file cleanup, and the worker response/timeout contract. Live PostgreSQL and M3 end-to-end checks are separate.

Run the PostgreSQL integration test from the repository root after building the image:

```bash
docker compose run --rm -e RUN_DATABASE_TESTS=1 ats-api npx tsx --test test/postgres.test.js
```

This sends a valid PDF through FastAPI, verifies the saved résumé and extracted text in PostgreSQL, and removes the temporary records.
