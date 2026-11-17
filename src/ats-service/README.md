# ATS API — tickets 4 and 5

For the backend feature summary and candidate profile/application API contracts, see [ATS_SERVICE_FEATURES.md](./ATS_SERVICE_FEATURES.md).

Express API. The database schema, migrations and generated Prisma client remain owned by `src/postgres/ats-db`; this service imports that client without copying the schema.

From the repository root:

```bash
docker compose --profile database run --build --rm ats-db-tools
docker compose up --build -d ats-api nginx
curl -k https://localhost/api/ats/health
```

The health endpoint checks PostgreSQL. M3's worker is not present in this repository; uploads require that worker to be reachable on `backend_net`. Job endpoints work independently of the worker.

## Jobs

| Method | Route | Access |
| --- | --- | --- |
| GET | `/api/ats/jobs?page=1&limit=20` | Public; OPEN jobs only |
| GET | `/api/ats/jobs/:id` | Public; OPEN jobs only |
| POST | `/api/ats/jobs` | HR/admin |
| PATCH | `/api/ats/jobs/:id` | HR creator or admin |
| DELETE | `/api/ats/jobs/:id` | HR creator or admin |

Writes require `Authorization: Bearer <accessToken>` from the Spring login endpoint. JWT subjects must be UUIDs. The middleware uses the same UTF-8 secret and key-length-dependent HMAC algorithm as Spring JJWT, and requires an expiration claim.

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

**Proposed response contract to coordinate with M3:**

```json
{
  "candidate": {
    "firstName": "Ada",
    "lastName": "Lovelace",
    "phone": "+212600000000",
    "location": "Casablanca",
    "bio": "Backend developer"
  },
  "rawText": "Extracted resume text...",
  "parserVersion": "m3-v1"
}
```

`candidate` and nonempty `rawText` are required; candidate fields are optional. Additional allowed candidate fields: `linkedinUrl`, `githubUrl`, `portfolioUrl` (URLs). The parser cannot assign a user ID. Change `src/worker.js` when M3 confirms a different response shape.

After parsing succeeds, a transaction upserts the candidate using JWT `sub`, creates the resume metadata/hash and a COMPLETED extraction with its text. Parsed fields update the candidate profile. Response: 201 with `{ candidate, resume }`. No application or job matching record is created by this endpoint. Worker failures return 502, timeouts 504, and invalid uploads 400/413/415. Database failure rolls back records and removes the new PDF. A process crash between file creation and commit can leave an orphan file; periodic cleanup is a future operational task.

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
database. The configured AI parser is probed separately; application and upload
success paths use an isolated HTTP app with a controlled parser response and
the real PostgreSQL database. A passing test does not certify the external parser.

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

This creates temporary job/candidate/resume records, checks the saved data, and removes those records afterward. It uses a controlled parser response, so it does not require M3. The real M3 upload flow still needs an end-to-end check with the worker.
