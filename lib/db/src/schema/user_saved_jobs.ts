import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { jobListingsTable } from "./job_listings";

export const userSavedJobsTable = pgTable("user_saved_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  jobId: integer("job_id").notNull().references(() => jobListingsTable.id, { onDelete: "cascade" }),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserSavedJob = typeof userSavedJobsTable.$inferSelect;
