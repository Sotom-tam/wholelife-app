import pool from "../../db.js";

export async function getTodayInTimezone(timezone) {
    const result = await pool.query(
        `SELECT (NOW() AT TIME ZONE $1)::date::text AS today`,
        [timezone]
    );
    return result.rows[0].today;
}
