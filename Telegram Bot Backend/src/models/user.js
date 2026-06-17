import pool from "../../db.js";

// Creates a new user row or updates an existing one by telegram_id.
// We use ON CONFLICT here so re-entering onboarding does not crash with a duplicate key error.
export async function createUser({ telegramId, name, timezone = "UTC" }) {
    const result = await pool.query(
        `INSERT INTO users (telegram_id, name, timezone, onboarding_complete)
         VALUES ($1, $2, $3, false)
         ON CONFLICT (telegram_id) DO UPDATE
           SET name = EXCLUDED.name,
               timezone = EXCLUDED.timezone,
               onboarding_complete = true
         RETURNING id`,
        [telegramId, name, timezone]
    )
    return result.rows[0].id
}

// Creates a goal for a user, returns the new goal's id
export async function createGoal({ userId, domain, surfaceGoal, identityStatement }) {
    const result = await pool.query(
        `INSERT INTO goals (user_id, domain, surface_goal, identity_statement, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id`,
        [userId, domain, surfaceGoal, identityStatement]
    )
    return result.rows[0].id
}

// Creates an MVA for a goal, returns the new mva's id
// Upsert an MVA for a goal. If an MVA already exists for this goal (an
// in-progress onboarding attempt), update it instead of inserting a new
// row. This prevents duplicate MVAs when step7 (final save) is retried.
export async function createMva({ goalId, description }) {
    try {
        const existing = await pool.query(
            `SELECT id FROM mvas WHERE goal_id = $1 ORDER BY id DESC LIMIT 1`,
            [goalId]
        )

        if (existing.rows[0]) {
            const mvaId = existing.rows[0].id
            await pool.query(
                `UPDATE mvas SET description = COALESCE($1, description), is_active = true WHERE id = $2`,
                [description ?? null, mvaId]
            )
            return mvaId
        }

        const result = await pool.query(
            `INSERT INTO mvas (goal_id, description, is_active)
             VALUES ($1, $2, true)
             RETURNING id`,
            [goalId, description]
        )
        return result.rows[0].id
    } catch (err) {
        console.error("createMva/upsert failed for goal_id", goalId, err)
        throw err
    }
}

// Returns the existing in-progress goal id for this user if one exists
// (i.e. a goal row belonging to a user whose onboarding_complete is false),
// otherwise creates a new one. Never creates a second in-progress row for
// the same user — always updates the existing one if found.
export async function upsertInProgressGoal({ userId, domain, surfaceGoal, identityStatement }) {
    // Look for an existing goal tied to this user while onboarding is incomplete.
    // Reuse the parent user's onboarding_complete flag as the signal — no new
    // columns needed, this mirrors the same logic already used in getResumeStepFromDb.
    const existing = await pool.query(
        `SELECT g.id FROM goals g
         JOIN users u ON u.id = g.user_id
         WHERE g.user_id = $1 AND u.onboarding_complete = false
         ORDER BY g.id DESC LIMIT 1`,
        [userId]
    )

    if (existing.rows[0]) {
        const goalId = existing.rows[0].id
        // Update only the fields that were actually passed in (don't null out
        // fields this particular checkpoint call doesn't know about yet).
        // COALESCE ensures we only overwrite when a non-null value is provided.
        await pool.query(
            `UPDATE goals SET
                domain = COALESCE($1, domain),
                surface_goal = COALESCE($2, surface_goal),
                identity_statement = COALESCE($3, identity_statement)
             WHERE id = $4`,
            [domain ?? null, surfaceGoal ?? null, identityStatement ?? null, goalId]
        )
        return goalId
    }

    const result = await pool.query(
        `INSERT INTO goals (user_id, domain, surface_goal, identity_statement, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id`,
        [userId, domain ?? null, surfaceGoal ?? null, identityStatement ?? null]
    )
    return result.rows[0].id
}

// Marks onboarding as complete for a user
export async function completeOnboarding(userId) {
    await pool.query(
        `UPDATE users SET onboarding_complete = true WHERE id = $1`,
        [userId]
    )
}

// Saves everything from onboarding in the right order
export async function saveOnboarding({ telegramId, name, domain, surfaceGoal, identityStatement, mva,reminderTime }) {
    const userId = await createUser({ telegramId, name })
    // Ensure we reuse the same in-progress goal row created during step3/step5
    // instead of inserting a duplicate. `upsertInProgressGoal` will return the
    // existing in-progress goal id when present, or create one if not.
    const goalId = await upsertInProgressGoal({ userId, domain, surfaceGoal, identityStatement })
    // Create or update the MVA for that goal. `createMva` is now upsert-safe
    // so retrying the final save won't produce duplicate MVA rows.
    await createMva({ goalId, description: mva })
    await completeOnboarding(userId)
    await updateReminderTime(userId, reminderTime)
    // Layer B: mark as fully complete (step 8 signals end of onboarding)
    try {
        await pool.query(
            `UPDATE users SET last_completed_step = 8 WHERE id = $1`,
            [userId]
        )
    } catch (err) {
        console.error("Failed to update last_completed_step to 8 for user_id", userId, err);
    }
}

// Gets a user by telegram_id, returns the full row or null if not found
export async function getUserByTelegramId(telegramId) {
    const result = await pool.query(
        `SELECT * FROM users WHERE telegram_id = $1`,
        [telegramId]
    )
    return result.rows[0] || null
}

export async function getUserWithLatestPractice(telegramId) {
    const result = await pool.query(
        `SELECT u.*, g.domain, g.surface_goal, m.description AS mva
         FROM users u
         LEFT JOIN LATERAL (
             SELECT * FROM goals WHERE user_id = u.id ORDER BY id DESC LIMIT 1
         ) g ON true
         LEFT JOIN LATERAL (
             SELECT * FROM mvas WHERE goal_id = g.id ORDER BY id DESC LIMIT 1
         ) m ON true
         WHERE u.telegram_id = $1`,
        [telegramId]
    )
    return result.rows[0] || null
}

// Updates the reminder_time for a user by id
export async function updateReminderTime(userId, reminderTime) {
    await pool.query(
        `UPDATE users SET reminder_time = $1 WHERE id = $2`,
        [reminderTime, userId]
    )
}

// Updates the reminder_enabled status for a user by id
export async function updateReminderStatus(userId, newStatus) {
    await pool.query(
        `UPDATE users SET reminder_enabled = $1 WHERE id = $2`,
        [newStatus, userId]
    )
}

// Layer B Resume — checkpoint writes at specific steps

// Upsert name after step1, mark as at step2
export async function saveOnboardingCheckpoint1({ telegramId, name }) {
    try {
        await pool.query(
            `INSERT INTO users (telegram_id, name, last_completed_step)
             VALUES ($1, $2, 2)
             ON CONFLICT (telegram_id) DO UPDATE
               SET name = EXCLUDED.name, last_completed_step = 2`,
            [telegramId, name]
        )
    } catch (err) {
        console.error("Failed to save onboarding checkpoint step1 for telegram_id", telegramId, err);
        // Don't throw — let the user continue; Layer A (session) is still primary
    }
}

// Update step marker to step3 (domain selected, but not durably stored in DB yet)
export async function updateOnboardingStep(telegramId, stepIndex) {
    try {
        await pool.query(
            `UPDATE users SET last_completed_step = $1 WHERE telegram_id = $2`,
            [stepIndex, telegramId]
        )
    } catch (err) {
        console.error("Failed to update onboarding step for telegram_id", telegramId, err);
        // Don't throw
    }
}

// After step3, create goal row + update step to 4
export async function saveGoalCheckpoint({ telegramId, domain, surfaceGoal }) {
    try {
        // Look up user_id by telegram_id
        const userResult = await pool.query(
            `SELECT id FROM users WHERE telegram_id = $1`,
            [telegramId]
        )
        if (!userResult.rows[0]) {
            console.error("No user found for telegram_id during goal checkpoint:", telegramId);
            return;
        }
        const userId = userResult.rows[0].id;
        
        // Create or update the single in-progress goal for this user.
        // We scope by the parent user's `onboarding_complete = false` so that
        // there is at most one in-progress goal row per user. COALESCE inside
        // `upsertInProgressGoal` ensures fields not provided here are preserved.
        await upsertInProgressGoal({ userId, domain, surfaceGoal })
        
        // Update step marker
        await pool.query(
            `UPDATE users SET last_completed_step = 4 WHERE id = $1`,
            [userId]
        )
    } catch (err) {
        console.error("Failed to save goal checkpoint for telegram_id", telegramId, err);
    }
}

// After step5, update identity_statement on latest goal + step to 6
export async function saveIdentityCheckpoint({ telegramId, identityStatement }) {
    try {
        const userResult = await pool.query(
            `SELECT id FROM users WHERE telegram_id = $1`,
            [telegramId]
        )
        if (!userResult.rows[0]) {
            console.error("No user found for telegram_id during identity checkpoint:", telegramId);
            return;
        }
        const userId = userResult.rows[0].id;
        
        // Update (or create-if-missing) the in-progress goal's identity_statement.
        // Using `upsertInProgressGoal` ensures we operate on the same goal row
        // scoped by `onboarding_complete = false` as other checkpoint code.
        await upsertInProgressGoal({ userId, identityStatement })
        
        // Update step marker
        await pool.query(
            `UPDATE users SET last_completed_step = 6 WHERE id = $1`,
            [userId]
        )
    } catch (err) {
        console.error("Failed to save identity checkpoint for telegram_id", telegramId, err);
    }
}

// Resume lookup — fetch user and latest goal/mva for Layer B fallback
export async function getResumeStepFromDb(telegramId) {
    try {
        const result = await pool.query(
            `SELECT 
                u.id,
                u.name,
                u.last_completed_step,
                u.onboarding_complete,
                g.domain,
                g.surface_goal,
                g.identity_statement
             FROM users u
             LEFT JOIN LATERAL (
                 SELECT * FROM goals WHERE user_id = u.id AND onboarding_complete IS NOT TRUE ORDER BY id DESC LIMIT 1
             ) g ON true
             WHERE u.telegram_id = $1`,
            [telegramId]
        )
        
        if (!result.rows[0]) {
            return null; // Brand new user
        }
        
        const user = result.rows[0];
        
        // If onboarding is already complete, don't use Layer B resume
        // (Layer A /start handler will show the welcome-back menu instead)
        if (user.onboarding_complete) {
            return null;
        }
        
        return {
            step: user.last_completed_step,
            data: {
                name: user.name,
                domain: user.domain,
                surfaceGoal: user.surface_goal,
                identityStatement: user.identity_statement,
            }
        };
    } catch (err) {
        console.error("Failed to get resume step from DB for telegram_id", telegramId, err);
        return null;
    }
}