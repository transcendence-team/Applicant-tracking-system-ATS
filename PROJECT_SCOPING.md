# Enterprise Applicant Tracking System (ATS) - Project Scoping Document

Some feature descriptions are ai generated and are subject to change in the future.

## 1. Project Description
This project is an Enterprise Applicant Tracking System (ATS) designed to streamline the hiring process. It provides a centralized platform where HR can manage job applications through a real-time Kanban pipeline, utilizing a localized LLM interface to parse, validate, and summarize candidate resumes against job requirements.

## 2. Mandatory Baselines (Critical for Evaluation)
* **HTTPS Enforcement:** All connections from the browser to the backend must be encrypted via HTTPS using TLS certificates configured in the NGINX reverse proxy (`:443 HTTPS / WSS`).
* **Legal Documentation:** Privacy Policy and Terms of Service pages must be fully accessible and populated with relevant content regarding candidate data privacy and GDPR compliance.
* **Database Schema:** A clear, documented database schema with well-defined relations for Users, Roles, Jobs, Applications, and Audit Logs in PostgreSQL.
* **Concurrent Multi-User Handling:** The system must handle multiple HR agents updating the Kanban board simultaneously without race conditions or data corruption.

## 3. Core Project Scope & Modules
**Active Target Points: 19 (6 Major Modules, 7 Minor Modules)**

### Core Web & Interaction (10 Points)
* **Web Frameworks (Major - 2pts):** Utilizing frameworks on both frontend and backend: Next.js (React) for the Frontend UI (`UI`), Java (Spring Boot) for the IAM Auth Service (`IAM`), and Node.js (Express) for the Core ATS Service (`ATS`).
* **Real-time Features (Major - 2pts):** Dedicated Real-Time WebSocket Service (`WS`, Socket.io) routed via NGINX (`/ws/`). Internal event triggers from the Core ATS broadcast live applicant and Kanban card updates to all active HR agents without a page refresh.
* **Use an ORM for the Database (Minor - 1pt):** Utilizing **Spring Data JPA (Hibernate)** in the Java Spring Boot Auth Service to manage Users and Roles, and an ORM (Prisma) in the Node.js Core ATS Service for type-safe relational database management.
* **Server-Side Rendering (Minor - 1pt):** Leveraging Next.js SSR on the Frontend UI for the public-facing "Job Board" pages (`GET /`) to ensure fast load times and SEO optimization.
* **File Upload (Minor - 1pt):** A secure upload zone for candidates to submit PDF resumes via Core ATS, featuring client-side React validation and server-side file type/size validation before dispatching to the AI parser.
* **Advanced Search (Minor - 1pt):** A search interface with drop-down filters (skill, date applied, status) and pagination to navigate high volumes of applicants.
* **Reusable Components (Minor - 1pt):** A custom-made design system comprising at least 10 reusable UI components (buttons, modals, Kanban cards, dropdowns, badges, inputs) following a strict color palette and typography ruleset.
* **Notification System (Minor - 1pt):** Triggering real-time in-app alerts (via the WebSocket service) to candidates and HR agents when an application stage updates (e.g., "Interview" or "Rejected").

### User & Access Management (3 Points)
* **Advanced Permissions System (Major - 2pts):** Strict Role-Based Access Control (RBAC) managed by the Spring Boot IAM Auth Service (`POST /api/auth/*`). Candidates view their own status, HR staff interact with the Kanban pipeline, and Admins manage users and roles.
* **Activity Dashboard (Minor - 1pt):** An analytics view displaying user activity insights, application volumes, and system interactions.

### AI Integration (2 Points)
* **LLM System Interface (Major - 2pts):** When a candidate uploads a resume, Core ATS triggers an internal `POST /parse` to the AI Worker Service (Python / FastAPI). The worker streams prompts to the local Ollama LLM engine to extract structured summaries and validate candidate skills against job postings, writing summaries directly to the database.

### DevOps & Infrastructure (4 Points)
* **Backend as Microservices (Major - 2pts):** The architecture is split into loosely coupled, containerized services partitioned across two isolated Docker networks:
  * `frontend_net`: NGINX API Gateway, Frontend UI (`UI`), IAM Auth Service (`IAM`), Core ATS Service (`ATS`), and Real-Time WS Service (`WS`).
  * `backend_net`: AI Worker Service (`AI`), Ollama Engine (`LLM`), and PostgreSQL Database (`DB`).
* **Monitoring System (Major - 2pts):** Prometheus collecting internal metrics from the microservices, visualized through a Grafana dashboard displaying real-time server health and API load.

## 4. Potential Fallback Modules (Extra Points)

* **Public API (Major - 2pts):** A documented, rate-limited public API secured via API keys.
* **Multiple Languages (Minor - 1pt):** Implementation of an i18n system supporting English, French, and Arabic, complete with a frontend language switcher.
* **Right-to-Left Support (Minor - 1pt):** Complete layout mirroring and UI adjustments for Arabic (RTL), integrated seamlessly with the language switcher.
* **Data Export and Import (Minor - 1pt):** A button on the HR dashboard allowing them to export the current pipeline of applicants to a CSV file.
* **GDPR Compliance Features (Minor - 1pt):** Allowing candidates to hit a button on their profile to download all their stored data, or permanently delete their account and resume from the database.
