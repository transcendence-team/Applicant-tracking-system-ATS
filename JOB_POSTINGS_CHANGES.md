# Job Postings API changes

Commit `383ec5c` adds Express and Prisma routes to create, list, read, update, and delete postings under `/api/ats/jobs`.

- Reused the RS256 JWT middleware for `POST`, `PATCH`, and `DELETE`. HR can edit and delete their own postings, and admins can manage any posting.
- Made open postings publicly readable. HR and admins can also read drafts, closed postings, and archived postings.
- Added validation for job fields, salary ranges, IDs, and pagination. The API returns `409` when a job has applications, preserving those records.
- Added an ATS-specific Docker Compose override that generates the Prisma client from the shared schema mounted read-only. See [the ATS README](./README.md) for startup instructions.

TypeScript and 23 HTTP checks passed against disposable PostgreSQL. The checks covered CRUD, JWT enforcement, ownership, and preservation of applications when deletion is blocked.
