# What I built in ats-service

I built the ATS backend API using JavaScript, Node.js, Express 5, and Prisma with PostgreSQL. This work provides APIs for the frontend team; it does not include dashboard screens.

- **Manage job offers:** Public users can browse open jobs and view job details. HR/admin users can create jobs. The HR creator or an admin can update or delete them. Jobs with applications must be archived instead of deleted.
- **Upload a resume:** Applicants can upload one PDF up to 10 MiB. The API validates the upload, sends it to the external AI parser, stores the PDF privately, and saves resume metadata and extracted text linked to the applicant's user UUID (`sub`).
- **Apply for a job:** Applicants can submit an application linking an open job, their authenticated user UUID (`sub`), and their own uploaded resume. An optional cover letter is supported. Expired deadlines, deleted/foreign resumes, and duplicate applications are rejected. Applications start with the seeded `Applied` status and an initial status-history entry.
- **View submitted applications and their statuses:** Applicants can list their own applications with pagination or retrieve a single application. Responses include the job summary, current status, selected resume metadata, and application dates. Other candidates' applications are inaccessible.
- **Protect backend access:** The API verifies Spring Boot RS256 JWTs using `JWT_PUBLIC_KEY` and enforces applicant, HR, and admin permissions. (User and candidate profile CRUD is handled by `auth-api` at `/api/auth/me`.)
- **Validate requests and handle errors:** Invalid inputs and database conflicts return consistent JSON errors with `error` and `message` fields.
- **Check database health:** A health endpoint checks PostgreSQL connectivity.

## All ATS API endpoints

| Method | Endpoint | Access and purpose |
| --- | --- | --- |
| GET | `/api/ats/health` | Public; check PostgreSQL connectivity |
| GET | `/api/ats/jobs?page=1&limit=20` | Public; list open jobs with pagination |
| GET | `/api/ats/jobs/:id` | Public; view an open job |
| POST | `/api/ats/jobs` | HR/admin; create a job |
| PATCH | `/api/ats/jobs/:id` | HR creator/admin; update a job |
| DELETE | `/api/ats/jobs/:id` | HR creator/admin; delete a job without applications |
| POST | `/api/ats/resumes` | Applicant; upload a PDF using multipart field `file` |
| POST | `/api/ats/applications` | Applicant; apply using my uploaded resume |
| GET | `/api/ats/applications?page=1&limit=20` | Applicant; list my applications and current statuses |
| GET | `/api/ats/applications/:id` | Applicant; read one of my applications |

Replace `:id` with the numeric job or application ID. List endpoints default to page 1 and limit 20; the maximum limit is 100.

Protected endpoints require an access token issued by the auth service:

```http
Authorization: Bearer <accessToken>
```

Applicant routes require `ROLE_APPLICANT`; job writes require `ROLE_HR` or `ROLE_ADMIN`. HR users may update/delete only jobs they created; admins may update/delete any job.

Send JSON bodies with `Content-Type: application/json`. For resume uploads, use `multipart/form-data` with one field named `file` containing a PDF up to 10 MiB.

### Apply for a job

POST `/api/ats/applications` with JSON:

```json
{
  "jobId": 1,
  "resumeId": 2,
  "coverLetter": "I would like to apply for this position."
}
```

`jobId` and `resumeId` are required positive integers. Use the resume ID returned by resume upload. Success returns HTTP 201 with the application and its current status. The database must first be seeded with the `Applied` application status. Duplicate applications and expired deadlines return 409; unavailable jobs/resumes return 404. Concurrent database conflicts return 409 and can be retried.

## Boundaries and verification

This service does not implement frontend screens, authentication registration/login/profile management (`/api/auth/me`), recruiter status-change APIs, AI job matching/ranking, or the AI parser itself. Candidates can read the current application status; changing that status belongs to the recruiter workflow. Resume upload requires the external parser to be available.

Run `npm test` from `src/ats-service`. Automated HTTP tests cover job management, RS256 JWT/roles, resume upload, application eligibility, ownership-scoped reads, duplicate checks, and pagination using mocked database/worker boundaries. Live PostgreSQL and real AI-worker verification are separate checks; see README.md.
