import {Pool} from "pg"
import { PostgreSQLSessionStore } from "telegraf-session-postgresql"

//setting up database connection
const pool= new Pool({
    connectionString:process.env.DATABASE_URL,
    ssl:false,
    max:8,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
})

pool.on('error', (err) => {
    console.error('Unexpected pool error:', err.message)
    // log it but do NOT crash
})

// Session store — wraps the pool so Telegraf can read/write sessions
export const sessionStore = new PostgreSQLSessionStore({ pool })
export default pool