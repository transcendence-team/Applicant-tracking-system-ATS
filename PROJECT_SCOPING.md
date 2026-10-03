# Enterprise Applicant Tracking System (ATS) - Project Scoping Document

Some feature descriptions are ai generated and are subject to change in the future.

## 1. Project Description
This project is an Enterprise Applicant Tracking System (ATS) designed to streamline the hiring process. It provides a centralized platform where HR can manage job applications through a real-time Kanban pipeline, utilizing a localized LLM interface to parse, validate, and summarize candidate resumes against job requirements.

## 2. Mandatory Baselines (Critical for Evaluation)
* **HTTPS Enforcement:** All connections from the browser to the backend must be encrypted via HTTPS using TLS certificates configured in the NGINX reverse proxy.
* **Legal Documentation:** Privacy Policy and Terms of Service pages must be fully accessible and populated with relevant content regarding candidate data privacy and GDPR compliance.
* **Database Schema:** A clear, documented database schema with well-defined relations for Users, Roles, Jobs, Applications, and Audit Logs.
* **Concurrent Multi-User Handling:** The system must handle multiple HR agents updating the Kanban board simultaneously without race conditions or data corruption.

## 3. Core Project Scope & Modules
**Active Target Points: 19 (6 Major Modules, 7 Minor Modules)**

### Core Web & Interaction (9 Points)
* **Web Frameworks (Major - 2pts):** utilizing frameworks on both front end and back end.
* **Server-Side Rendering (Minor - 1pt):** Leveraging Next.js SSR for the public-facing "Job Board" pages to ensure fast load times and SEO optimization.
* **Real-time Features (Major - 2pts):** WebSockets powering the HR Kanban board. When a candidate applies, their card instantly populates in the "New" column for all active HR agents without a page refresh.
* **File Upload (Minor - 1pt):** A secure upload zone for candidates to submit PDF resumes, featuring client-side React validation and server-side file type/size validation.
* **Advanced Search (Minor - 1pt):** A search interface with drop-down filters (skill, date applied, status) and pagination to navigate high volumes of applicants.
* **Reusable Components (Minor - 1pt):** A custom-made design system comprising at least 10 reusable UI components (buttons, modals, Kanban cards, dropdowns) following a strict color palette and typography ruleset.
* **Notification System (Minor - 1pt):** Triggering in-app alerts or automated emails to candidates when an HR agent moves their Kanban card to "Interview" or "Rejected".

### User & Access Management (3 Points)
* **Advanced Permissions System (Major - 2pts):** Strict Role-Based Access Control (RBAC). Candidates only view their own status; HR staff interact with the Kanban pipeline; Admins manage overall system configuration.
* **Activity Dashboard (Minor - 1pt):** An analytics view displaying user activity insights, application volumes, and system interactions.

### AI Integration (2 Points)
* **LLM System Interface (Major - 2pts):** When a candidate uploads a resume, the backend extracts the raw text and sends it as a prompt the model streams back a structured summary and validates whether the candidate's skills match the job posting.

### DevOps & Infrastructure (5 Points)
* **Backend as Microservices (Major - 2pts):** The architecture is split into loosely coupled, containerized services (Frontend/API Service, AI Processing Worker, Relational Database) routed via NGINX.
* **Monitoring System (Major - 2pts):** Prometheus collecting internal metrics from the microservices, visualized through a Grafana dashboard displaying real-time server health and API load.

## 4. Potential Fallback Modules (Extra Points)

* **Public API (Major - 2pts):** A documented, rate-limited public API secured via API keys.
* **Multiple Languages (Minor - 1pt):** Implementation of an i18n system supporting English, French, and Arabic, complete with a frontend language switcher.
* **Right-to-Left Support (Minor - 1pt):** Complete layout mirroring and UI adjustments for Arabic (RTL), integrated seamlessly with the language switcher.
* **Data Export and Import (Minor - 1pt):** A button on the HR dashboard allowing them to export the current pipeline of applicants to a CSV file.
* **GDPR Compliance Features (Minor - 1pt):** Allowing candidates to hit a button on their profile to download all their stored data, or permanently delete their account and resume from the database.
