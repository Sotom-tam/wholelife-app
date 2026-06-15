import pool from "../db.js";

// Creates a new user row, returns the new user's id
export async function createUser({ telegramId, name, timezone = "UTC" }) {
    const result = await pool.query(
        `INSERT INTO users (telegram_id, name, timezone, onboarding_complete)
         VALUES ($1, $2, $3, false)
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
    const goalId = await createGoal({ userId, domain, surfaceGoal, identityStatement })
    await createMva({ goalId, description: mva })
    await completeOnboarding(userId)
    await updateReminderTime(userId, reminderTime)
}

// Gets a user by telegram_id, returns the full row or null if not found
export async function getUserByTelegramId(telegramId) {
    const result = await pool.query(
        `SELECT * FROM users WHERE telegram_id = $1`,
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