import { db } from "../db/schema";
import { sql } from "drizzle-orm";

async function main() {
    try {
        console.log("Adding response_status column...");
        await db.execute(sql`ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS response_status INTEGER NOT NULL DEFAULT 200;`);
        console.log("Column added successfully");
    } catch (e) {
        console.error("Error adding column:", e);
    }
    process.exit(0);
}

main();
