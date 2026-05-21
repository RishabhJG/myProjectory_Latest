import { drizzle } from "drizzle-orm/mysql2"; // Drizzle ORM MySQL connector
import mysql from "mysql2/promise"; // MySQL2 promise-based driver
import * as schema from "./schema"; // IMPORTANT: point to schema folder

// Ensure DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

// Create MySQL connection pool
export const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Initialize Drizzle with schema
export const db = drizzle(pool, { schema, mode: "default" });

// Export schema if needed elsewhere
export * from "./schema";
