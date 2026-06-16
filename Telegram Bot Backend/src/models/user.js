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
export async function createMva({ goalId, description }) {
    const result = await pool.query(
        `INSERT INTO mvas (goal_id, description, is_active)
         VALUES ($1, $2, true)
         RETURNING id`,
        [goalId, description]
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
    // If this user already exists, we insert a fresh goal + MVA row rather than overwriting the old one.
    // This keeps historical practice data intact while still letting them restart.
    const goalId = await createGoal({ userId, domain, surfaceGoal, identityStatement })
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
        
        // Create goal row
        await pool.query(
            `INSERT INTO goals (user_id, domain, surface_goal, is_active)
             VALUES ($1, $2, $3, true)`,
            [userId, domain, surfaceGoal]
        )
        
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
        
        // Update latest goal's identity_statement
        await pool.query(
            `UPDATE goals 
             SET identity_statement = $1 
             WHERE user_id = $2 AND id = (
                 SELECT id FROM goals WHERE user_id = $2 ORDER BY id DESC LIMIT 1
             )`,
            [identityStatement, userId]
        )
        
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