# What I built in ats-service

I built the ATS backend API using JavaScript, Node.js, Express 5, and Prisma with PostgreSQL. This work provides APIs for the frontend team; it does not include dashboard screens.

- **Manage job offers:** Public users can browse open jobs and view job details. HR/admin users can create jobs. The HR creator or an admin can update or delete them. Jobs with applications must be archived instead of deleted.
- **Upload a resume:** Applicants can upload one PDF up to 10 MiB. The API validates the upload, sends it to the external AI parser, stores the PDF privately, and saves resume metadata, extracted text, and candidate details.
- **Apply for a job:** Applicants can submit an application linking an open job, their candidate profile, and their own uploaded resume. An optional cover letter is supported. Expired deadlines, deleted/foreign resumes, and duplicate applications are rejected. Applications start with the seeded `Applied` status and an initial status-history entry.
- **View submitted applications and their statuses:** Applicants can list their own applications with pagination or retrieve a single application. Responses include the job summary, current status, selected resume metadata, and application dates. Other candidates' applications are inaccessible.
- **View/update the candidate profile:** Applicants can read their own profile and create or partially update their name, phone, location, biography, and LinkedIn/GitHub/portfolio URLs. Identity comes from the signed JWT; clients cannot assign user IDs or modify roles.
- **Protect backend access:** The API verifies Spring Boot JWTs using the shared secret and enforces applicant, HR, and admin permissions.
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
| GET | `/api/ats/candidates/me` | Applicant; read my profile; 404 if it does not exist |
| PATCH | `/api/ats/candidates/me` | Applicant; create or partially update my profile |
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

`jobId` and `resumeId` are required positive integers. Use the resume ID returned by resume upload. Success returns HTTP 201 with the application and its current status. The database must first be seeded with the `Applied` application status. Duplicate applications and expired deadlines return 409; unavailable jobs/resumes or a missing profile return 404. Concurrent database conflicts return 409 and can be retried.

### Update my profile

PATCH `/api/ats/candidates/me` with a nonempty JSON object:

```json
{
  "firstName": "Ada",
  "lastName": "Lovelace",
  "location": "Casablanca",
  "bio": "Backend developer",
  "githubUrl": "https://github.com/example"
}
```

Allowed fields: `firstName`, `lastName`, `phone`, `location`, `bio`, `linkedinUrl`, `githubUrl`, `portfolioUrl`. Omitted fields remain unchanged; `null` clears a field. URLs must use HTTP or HTTPS. Success returns HTTP 200 with the profile. This endpoint creates the profile when it does not already exist.

## Boundaries and verification

This service does not implement frontend screens, authentication registration/login, recruiter status-change APIs, AI job matching/ranking, or the AI parser itself. Candidates can read the current application status; changing that status belongs to the recruiter workflow. Resume upload requires the external parser to be available.

Run `npm test` from `src/ats-service`. Automated HTTP tests cover job management, JWT/roles, resume upload, candidate profile validation, application eligibility, ownership-scoped reads, duplicate checks, and pagination using mocked database/worker boundaries. Live PostgreSQL and real AI-worker verification are separate checks; see README.md.
