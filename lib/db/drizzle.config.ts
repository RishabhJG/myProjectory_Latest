import dotenv from "dotenv"; // Import dotenv to load environment variables
import path from "path"; // Import path to resolve file paths
import { defineConfig } from "drizzle-kit"; // Import drizzle config helper

// Load .env file from root BEFORE accessing process.env
dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

// Debug: check if DATABASE_URL is loaded
console.log("DB URL:", process.env.DATABASE_URL);

// Throw error if DATABASE_URL is missing (fail fast)
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not found. Check your .env file.");
}

// Export drizzle configuration
export default defineConfig({
  schema: "./src/schema", // Path to your schema
  dialect: "mysql", // MySQL dialect
  dbCredentials: {
    url: process.env.DATABASE_URL, // Use env variable (mysql://user:pass@host:port/db)
  },
});