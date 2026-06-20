// src/db/reminderQueries.js
import pool from "../../db.js";

export async function getUsersDueForReminder() {
    const result = await pool.query(`
        SELECT
            u.telegram_id,
            u.name,
            u.timezone,
            (NOW() AT TIME ZONE u.timezone)::time AS current_time,
            (NOW() AT TIME ZONE u.timezone)::date AS current_date,
            g.domain,
            g.surface_goal,
            m.description AS mva
        FROM users u
        JOIN goals g ON g.user_id = u.id
        JOIN mvas m ON m.goal_id = g.id
        WHERE
            u.reminder_enabled = true
            AND u.onboarding_complete = true

            -- reminder time has passed
            AND (NOW() AT TIME ZONE u.timezone)::time >= u.reminder_time

            -- today's reminder has not been sent yet
            AND (
                u.last_reminder_sent_at IS NULL
                OR
                (u.last_reminder_sent_at AT TIME ZONE u.timezone)::date
                    <
                (NOW() AT TIME ZONE u.timezone)::date
            );
        `);
    console.log("Users due for reminder:", result.rows);
    return result.rows;
}

export async function markReminderSent(telegramId) {
    await pool.query(
        `UPDATE users SET last_reminder_sent_at = NOW() WHERE telegram_id = $1`,
        [telegramId]
    );
}