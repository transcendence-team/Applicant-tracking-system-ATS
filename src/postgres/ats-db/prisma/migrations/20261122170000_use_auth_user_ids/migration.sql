BEGIN;

-- Databases created with the revised baseline already have user_id.
DO $$
BEGIN
    IF to_regclass('public.candidate_profiles') IS NOT NULL THEN
        ALTER TABLE "resumes" ADD COLUMN "user_id" UUID;
        UPDATE "resumes" AS resume
        SET "user_id" = candidate."user_id"
        FROM "candidate_profiles" AS candidate
        WHERE candidate."id" = resume."candidate_id";
        ALTER TABLE "resumes" ALTER COLUMN "user_id" SET NOT NULL;

        ALTER TABLE "applications" ADD COLUMN "user_id" UUID;
        UPDATE "applications" AS application
        SET "user_id" = candidate."user_id"
        FROM "candidate_profiles" AS candidate
        WHERE candidate."id" = application."candidate_id";
        ALTER TABLE "applications" ALTER COLUMN "user_id" SET NOT NULL;

        ALTER TABLE "resumes" DROP COLUMN "candidate_id";
        ALTER TABLE "applications" DROP COLUMN "candidate_id";
        CREATE INDEX "resumes_user_id_idx" ON "resumes"("user_id");
        CREATE INDEX "applications_user_id_idx" ON "applications"("user_id");
        CREATE UNIQUE INDEX "applications_job_id_user_id_key" ON "applications"("job_id", "user_id");

        -- Keep profile data available for a separate Auth import.
        CREATE SCHEMA IF NOT EXISTS "ats_legacy_profiles";
        ALTER TABLE "candidate_profiles" SET SCHEMA "ats_legacy_profiles";
        ALTER TABLE "employee_profiles" SET SCHEMA "ats_legacy_profiles";
    END IF;
END;
$$;

COMMIT;
