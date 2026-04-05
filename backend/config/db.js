import "dotenv/config"
import pkg from "pg"

const { Pool } = pkg

// Load env before Pool: app.js runs dotenv.config() only after imports resolve,
// so without this, DB_* vars are missing and pg falls back to port 5432.
const dbPort = Number(process.env.DB_PORT)

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number.isFinite(dbPort) && dbPort > 0 ? dbPort : 5432,
})

export default pool