import pool from "../../db.js"
export async function recordCheckin({ mvaId, userId, completed, note = null, timezone }) {
    const result = await pool.query(
        `
        INSERT INTO checkins (user_id, mva_id, checked_in_on, completed, note, created_at)
        VALUES ($1, $2, (NOW() AT TIME ZONE $5)::date, $3, $4, NOW())
        ON CONFLICT (mva_id, checked_in_on)
        DO UPDATE SET
            completed = EXCLUDED.completed,
            note = COALESCE(EXCLUDED.note, checkins.note),
            created_at = NOW()
        RETURNING id, user_id, mva_id, checked_in_on, completed, note;
        `,
        [userId, mvaId, completed, note, timezone]
    );
    return result.rows[0];
}

export async function getTodaysCheckin(mvaId, timezone) {
    const result = await pool.query(
        `SELECT id, user_id, mva_id, checked_in_on, completed, note
         FROM checkins
         WHERE mva_id = $1
           AND checked_in_on = (NOW() AT TIME ZONE $2)::date`,
        [mvaId, timezone]
    );
    return result.rows[0] ?? null;
}