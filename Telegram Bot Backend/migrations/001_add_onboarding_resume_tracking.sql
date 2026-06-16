-- Migration: Add onboarding resume tracking (Layer B fallback)
-- This adds the ability to resume incomplete onboarding from the database
-- if the session store is lost/expired (Layer A).

ALTER TABLE users ADD COLUMN last_completed_step SMALLINT NOT NULL DEFAULT 0;

-- identity_statement may already exist in goals, but ensure it's there
ALTER TABLE goals ADD COLUMN identity_statement TEXT;

-- Comment explaining the column usage for maintainers:
-- last_completed_step: 0-indexed wizard step the user is currently on or has completed.
-- step0 = greeting, step1 = name confirmed, step2 = domain selected, etc.
-- This allows /start to offer a warm resume message + rehydrate wizard state
-- and jump to the right step without re-asking earlier questions.
