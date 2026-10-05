
-- ---------------------------------------------------------------
-- CHECK constraints (Prisma can't model these, so they live in raw SQL)
-- Appended to the init migration.
-- ---------------------------------------------------------------
ALTER TABLE "jobs" ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('draft','open','paused','closed','archived'));
ALTER TABLE "jobs" ADD CONSTRAINT jobs_employment_type_check
  CHECK (employment_type IS NULL OR employment_type IN ('full_time','part_time','contract','internship','freelance'));
ALTER TABLE "jobs" ADD CONSTRAINT jobs_salary_check
  CHECK (salary_min >= 0 AND salary_max >= 0 AND (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min));
ALTER TABLE "job_skills" ADD CONSTRAINT job_skills_importance_check
  CHECK (importance IS NULL OR importance BETWEEN 1 AND 5);
ALTER TABLE "resumes" ADD CONSTRAINT resumes_file_size_check
  CHECK (file_size IS NULL OR file_size >= 0);
ALTER TABLE "resume_extractions" ADD CONSTRAINT resume_extractions_status_check
  CHECK (status IN ('pending','processing','completed','failed'));
ALTER TABLE "ai_analyses" ADD CONSTRAINT ai_analyses_status_check
  CHECK (analysis_status IN ('pending','processing','completed','failed'));
ALTER TABLE "ai_analyses" ADD CONSTRAINT ai_analyses_score_check
  CHECK (match_score IS NULL OR match_score BETWEEN 0 AND 100);
ALTER TABLE "ai_skill_matches" ADD CONSTRAINT ai_skill_matches_confidence_check
  CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1);
ALTER TABLE "gdpr_requests" ADD CONSTRAINT gdpr_request_type_check
  CHECK (request_type IN ('access','export','erasure','rectification'));
ALTER TABLE "gdpr_requests" ADD CONSTRAINT gdpr_status_check
  CHECK (status IN ('pending','in_progress','completed','rejected'));
