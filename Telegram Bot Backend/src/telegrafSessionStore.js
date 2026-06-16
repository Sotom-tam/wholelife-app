// src/sessionStore.js
//
// Custom Postgres-backed store for @telegraf/session.
// @telegraf/session expects a store object with async get/set/delete methods.
// This implements that contract directly against the existing pg Pool,
// so we don't depend on a third-party package staying in sync with
// Telegraf's internal session API.

import pool from "../db.js";

// One-time table setup. Call this once at startup (see bot.js wiring below).
export async function ensureSessionTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
            key TEXT PRIMARY KEY,
            data JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);
}

export const pgSessionStore = {
    async get(key) {
        const result = await pool.query(
            `SELECT data FROM sessions WHERE key = $1`,
            [key]
        );
        return result.rows[0]?.data ?? undefined;
    },

    async set(key, data) {
        await pool.query(
            `INSERT INTO sessions (key, data, updated_at)
             VALUES ($1, $2, now())
             ON CONFLICT (key)
             DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
            [key, data]
        );
    },

    async delete(key) {
        await pool.query(`DELETE FROM sessions WHERE key = $1`, [key]);
    },
};