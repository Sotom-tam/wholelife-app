import {Pool} from "pg"
import PostgreSQLSession from "telegraf-session-postgresql"

console.log("DATABASE_URL:", process.env.DATABASE_URL);
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
// // Session store — wraps the pool so Telegraf can read/write sessions
// export const telegramSessionStore = new PostgreSQLSession({ 
//     connectionString: process.env.DATABASE_URL,
//     ssl: false,
// })
export default pool