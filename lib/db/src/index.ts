import { drizzle } from "drizzle-orm/node-postgres"; // Drizzle ORM connector
import pg from "pg"; // PostgreSQL driver
import * as schema from "./schema"; // IMPORTANT: point to schema folder

const { Pool } = pg;

// Ensure DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

// Create PostgreSQL connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Drizzle with schema
export const db = drizzle(pool, { schema });

// Export schema if needed elsewhere
export * from "./schema";