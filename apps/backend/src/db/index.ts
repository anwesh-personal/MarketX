import { Pool } from "pg";
import { config } from "../config";

export const db = new Pool({
    connectionString: config.databaseUrl,
});

// Test connection on startup
db.query("SELECT NOW()", (err, res) => {
    if (err) {
        console.error("❌ Database connection failed:", err);
        process.exit(1);
    }
    console.log("✅ Database connected at:", res.rows[0].now);
});
