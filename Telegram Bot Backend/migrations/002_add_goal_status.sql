-- Migration: Add status column to goals for draft/active lifecycle
-- Adds a status column to manage goal lifecycle (draft, active, archived)

ALTER TABLE goals ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft';

-- Backfill existing rows as 'active' since they predate this draft workflow.
UPDATE goals SET status = 'active';

-- Notes for maintainers:
-- - New goal rows created during onboarding should start as 'draft' until
--   finalized (activated) by application logic.
-- - Reserved statuses: 'draft', 'active', 'archived'.
