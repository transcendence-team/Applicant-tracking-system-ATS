# Project Development Rules & Guidelines

This document defines the Git/GitHub workflows, branch conventions, and code formatting rules for the team.

---

## 1. Git & GitHub Rules

### 1.1 Branch Naming Convention
All branches must follow a prefixed naming pattern describing the purpose of the work:

```
→ [ feature/ ]  - for new features (e.g., feature/login-system)
  
→ [ bugfix/ ]   - for fixing bugs (e.g., bugfix/header-alignment)

→ [ docs/ ]     - for documentation updates (e.g., docs/update-readme)

→ [ refactor/ ] - for code changes that don't add features or fix bugs
```

* **Rules:**
  * Use lowercase letters and kebab-case for branch descriptions (e.g., `feature/kanban-drag-drop`, not `Feature/KanbanDragDrop`).
  * Keep branch names short, descriptive, and focused on a single responsibility.

### 1.2 Branching Strategy & Workflow
* **`main` Branch:**
  * Production-ready release branch.
  * Direct commits to `main` are strictly forbidden.
  * Only merges from `dev` via approved release PRs.
* **`dev` Branch:**
  * Primary shared integration branch.
  * All feature, bugfix, docs, and refactor branches branch off `dev` and merge back into `dev`.
* **Feature Lifecycle:**
  1. Pull latest `dev`: `git checkout dev && git pull origin dev`
  2. Create working branch: `git checkout -b feature/your-feature`
  3. Commit changes regularly with clear messages.
  4. Push branch and open a Pull Request (PR) against `dev`.

### 1.3 Commit Message Guidelines
Per the 42 subject evaluation requirements, commit history must show clear, meaningful messages and balanced team contributions:
* Format: `<type>: <short imperative summary>`
* Examples:
  * `feat: implement jwt authentication filter in spring boot`
  * `fix: prevent duplicate card drop on kanban board`
  * `docs: update tech stack port mapping table`
  * `refactor: extract reusable modal component`
* Do **not** use vague commit messages (e.g., `update`, `fix`, `wip`, `changes`).

### 1.4 Pull Requests & Code Review
* **Approvals:** At least 1 team peer review approval is required before merging into `dev`.
* **Self-Merging:** Developers must **not** merge their own PRs without peer review approval.
* **Merge Conflicts:** The PR author is responsible for rebasing or pulling latest `dev` and resolving conflicts before merge.
* **Clean State:** All code must build and pass linting checks before PR approval.

---

## 2. Code Formatting & Linting Rules

### 2.1 Frontend (Next.js / React / Tailwind CSS)
* **Linter & Formatter:** ESLint + Prettier.
* **Console Hygiene (Subject Requirement):** Zero errors or warnings in the browser console. Remove all `console.log` statements before opening a PR.
* **Naming Conventions:**
  * React Components: `PascalCase` (e.g., `KanbanColumn.tsx`, `ApplicantCard.tsx`).
  * Hooks: `camelCase` starting with `use` (e.g., `useWebSocket.ts`).
  * Utilities & Styles: `kebab-case` or `camelCase` (e.g., `format-date.ts`).
* **Design System:** Use designated reusable UI components and Tailwind design tokens rather than arbitrary inline styles.

### 2.2 Java (Spring Boot)
* **Code Style:** Google Java Format.
* **Architecture Pattern:** Controller $\rightarrow$ Service $\rightarrow$ Repository pattern.
* **Naming Conventions:**
  * Classes / Interfaces: `PascalCase` (e.g., `AuthController`, `UserService`, `UserRepository`).
  * Methods / Variables: `camelCase` (e.g., `generateJwtToken()`, `currentUser`).
  * Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_TOKEN_VALIDITY`).
* **Entity Management:** Manage persistence solely through Spring Data JPA / Hibernate annotations (`@Entity`, `@Table`, `@Id`).

### 2.3 Node.js (Core ATS API & Real-Time WS)
* **Linter & Formatter:** ESLint + Prettier.
* **Async Operations:** Always use `async/await` syntax with structured error handling; avoid unhandled Promise rejections.
* **Module System:** ES Modules (`import` / `export`).

### 2.4 Python (FastAPI / AI Worker)
* **Linter & Formatter:** Black + Flake8 (or Ruff).
* **Type Annotations:** Use Python type hints and Pydantic models for all endpoint request bodies and response schemas.
* **Docstrings:** Use Google-style or PEP 257 docstrings for non-trivial service functions.

---

## 3. Standardized Error Format & Contracts

Every API across all backend services (Java Spring Boot, Node.js Express, Python FastAPI) must return error responses adhering to the uniform schema:

```json
{
  "error": "SHORT_ERROR_CODE",
  "message": "Human-readable description of what went wrong."
}
```

---

## 4. Secret & Security Hygiene

* **Never Commit Secrets:** Passwords, database credentials, API keys, and JWT secrets must **never** be committed to Git.
* **`.env` Management:**
  * All secrets reside in local `.env` files (must be listed in `.gitignore`).
  * Always maintain an updated `.env.example` in the repository with placeholder values to enable easy setup for evaluators.
