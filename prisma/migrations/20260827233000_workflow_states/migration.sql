-- Goal workflow + review state rename (safe if init already applied).
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft';

UPDATE "reviews" SET "status" = 'not_started' WHERE "status" IN ('NOT_STARTED', 'SELF_IN_PROGRESS', 'not_started');
UPDATE "reviews" SET "status" = 'self_appraisal_submitted' WHERE "status" IN ('SELF_SUBMITTED', 'self_appraisal_submitted');
UPDATE "reviews" SET "status" = 'manager_reviewed' WHERE "status" IN ('MANAGER_IN_PROGRESS', 'MANAGER_SUBMITTED', 'manager_reviewed');
UPDATE "reviews" SET "status" = 'completed' WHERE "status" IN ('CALIBRATED', 'ACKNOWLEDGED', 'completed');

ALTER TABLE "reviews" ALTER COLUMN "status" SET DEFAULT 'not_started';
