// src/db/reminderQueries.js
import { pool } from "../config/db.js";

export async function getUsersDueForReminder() {
    const result = await pool.query(`
        SELECT
            u.telegram_id,
            u.name,
            u.timezone,
            g.domain,
            g.surface_goal,
            m.action_text AS mva
        FROM users u
        JOIN goals g ON g.user_id = u.id
        JOIN mvas m ON m.goal_id = g.id
        WHERE u.reminder_enabled = true
          AND u.onboarding_complete = true
          AND to_char(
                NOW() AT TIME ZONE u.timezone,
                'HH24:MI'
              ) = to_char(u.reminder_time, 'HH24:MI')
    `);
    return result.rows;
}