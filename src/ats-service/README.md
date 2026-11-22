# ATS job postings

Added job posting CRUD to the Express service with the existing Prisma job model and RS256 JWT middleware. The ATS service generates its client from the shared PostgreSQL schema. The service-specific Compose override mounts that schema read-only and keeps the generated client in the container.

| Method | Route | Access |
| --- | --- | --- |
| GET | `/api/ats/jobs?page=1&limit=20` | Public open jobs. HR and admins can also read drafts, closed and archived jobs. |
| GET | `/api/ats/jobs/:id` | Same visibility as the list route. |
| POST | `/api/ats/jobs` | HR or admin JWT. Returns 201. |
| PATCH | `/api/ats/jobs/:id` | Job creator with an HR JWT, or an admin. Returns the updated job. |
| DELETE | `/api/ats/jobs/:id` | Job creator with an HR JWT, or an admin. Returns 204. Jobs with applications return 409 and can be archived with PATCH. |

Send the Auth access token in `Authorization: Bearer <token>` and JSON bodies with `Content-Type: application/json`. Create requires a `title` and defaults to `DRAFT`. Optional fields are `description`, `location`, `employmentType`, `status`, `salaryMin`, `salaryMax`, `publishedAt` and `deadline`. Dates use ISO 8601 timestamps with a timezone. PATCH accepts a nonempty subset of the same fields. The JWT supplies `createdBy`.

From the repository root, with the ATS database schema applied and `DATABASE_URL` and `JWT_PUBLIC_KEY` configured:

```powershell
docker compose -f docker-compose.yml -f src/ats-service/compose.jobs.yml up -d --build ats-api
```

The API is available to the existing gateway. For a local Node.js 22 run, install dependencies in `src/ats-service`, set `DATABASE_URL` and `JWT_PUBLIC_KEY` in that shell, then run `npm run prisma:generate` followed by `npm run dev`.
