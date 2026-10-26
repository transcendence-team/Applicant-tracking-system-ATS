-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "Recommendation" AS ENUM ('STRONG_MATCH', 'MATCH', 'PARTIAL_MATCH', 'NO_MATCH');

-- CreateEnum
CREATE TYPE "SkillMatchType" AS ENUM ('EXACT', 'RELATED', 'MISSING');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPLICATION_RECEIVED', 'STATUS_CHANGED', 'NEW_APPLICANT', 'AI_ANALYSIS_READY', 'JOB_ASSIGNED');

-- CreateEnum
CREATE TYPE "GdprRequestType" AS ENUM ('EXPORT', 'DELETE');

-- CreateEnum
CREATE TYPE "GdprRequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "candidate_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "linkedin_url" TEXT,
    "github_url" TEXT,
    "portfolio_url" TEXT,
    "bio" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "department" TEXT,
    "job_title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" SERIAL NOT NULL,
    "created_by" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "employment_type" "EmploymentType",
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "published_at" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_recruiters" (
    "job_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "assigned_by" UUID,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_recruiters_pkey" PRIMARY KEY ("job_id","user_id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_skills" (
    "job_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "importance" INTEGER,

    CONSTRAINT "job_skills_pkey" PRIMARY KEY ("job_id","skill_id")
);

-- CreateTable
CREATE TABLE "application_statuses" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "application_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" SERIAL NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "original_filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_hash" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "resume_id" INTEGER,
    "status_id" INTEGER NOT NULL,
    "cover_letter" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_status_history" (
    "id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "from_status_id" INTEGER,
    "to_status_id" INTEGER NOT NULL,
    "changed_by" UUID,
    "comment" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_extractions" (
    "id" SERIAL NOT NULL,
    "resume_id" INTEGER NOT NULL,
    "raw_text" TEXT,
    "parser_version" TEXT,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "extracted_at" TIMESTAMP(3),

    CONSTRAINT "resume_extractions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "resume_id" INTEGER,
    "model_name" TEXT,
    "prompt_version" TEXT,
    "summary" TEXT,
    "match_score" DECIMAL(5,2),
    "recommendation" "Recommendation",
    "analysis_status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_skill_matches" (
    "id" SERIAL NOT NULL,
    "ai_analysis_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "match_type" "SkillMatchType" NOT NULL,
    "confidence" DECIMAL(4,3),

    CONSTRAINT "ai_skill_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "application_id" INTEGER,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" INTEGER,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" SERIAL NOT NULL,
    "user_id" UUID,
    "event_type" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gdpr_requests" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "request_type" "GdprRequestType" NOT NULL,
    "status" "GdprRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "gdpr_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_profiles_user_id_key" ON "candidate_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_user_id_key" ON "employee_profiles"("user_id");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_created_by_idx" ON "jobs"("created_by");

-- CreateIndex
CREATE INDEX "job_recruiters_user_id_idx" ON "job_recruiters"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE INDEX "job_skills_skill_id_idx" ON "job_skills"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_statuses_name_key" ON "application_statuses"("name");

-- CreateIndex
CREATE INDEX "resumes_candidate_id_idx" ON "resumes"("candidate_id");

-- CreateIndex
CREATE INDEX "resumes_file_hash_idx" ON "resumes"("file_hash");

-- CreateIndex
CREATE INDEX "applications_status_id_idx" ON "applications"("status_id");

-- CreateIndex
CREATE INDEX "applications_candidate_id_idx" ON "applications"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_job_id_candidate_id_key" ON "applications"("job_id", "candidate_id");

-- CreateIndex
CREATE INDEX "application_status_history_application_id_idx" ON "application_status_history"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "resume_extractions_resume_id_key" ON "resume_extractions"("resume_id");

-- CreateIndex
CREATE INDEX "ai_analyses_application_id_idx" ON "ai_analyses"("application_id");

-- CreateIndex
CREATE INDEX "ai_skill_matches_ai_analysis_id_idx" ON "ai_skill_matches"("ai_analysis_id");

-- CreateIndex
CREATE INDEX "ai_skill_matches_skill_id_idx" ON "ai_skill_matches"("skill_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "activity_events_user_id_idx" ON "activity_events"("user_id");

-- CreateIndex
CREATE INDEX "activity_events_event_type_idx" ON "activity_events"("event_type");

-- CreateIndex
CREATE INDEX "gdpr_requests_user_id_idx" ON "gdpr_requests"("user_id");

-- AddForeignKey
ALTER TABLE "job_recruiters" ADD CONSTRAINT "job_recruiters_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "application_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_from_status_id_fkey" FOREIGN KEY ("from_status_id") REFERENCES "application_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_to_status_id_fkey" FOREIGN KEY ("to_status_id") REFERENCES "application_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_extractions" ADD CONSTRAINT "resume_extractions_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_skill_matches" ADD CONSTRAINT "ai_skill_matches_ai_analysis_id_fkey" FOREIGN KEY ("ai_analysis_id") REFERENCES "ai_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_skill_matches" ADD CONSTRAINT "ai_skill_matches_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
