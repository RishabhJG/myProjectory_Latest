import { mysqlTable, int, timestamp } from "drizzle-orm/mysql-core";
import { usersTable } from "./users";
import { jobListingsTable } from "./job_listings";

export const userSavedJobsTable = mysqlTable("user_saved_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  jobId: int("job_id").notNull().references(() => jobListingsTable.id, { onDelete: "cascade" }),
  savedAt: timestamp("saved_at").notNull().defaultNow(),
});

export type UserSavedJob = typeof userSavedJobsTable.$inferSelect;
