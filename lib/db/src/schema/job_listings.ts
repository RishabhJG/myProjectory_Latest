import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const jobListingsTable = pgTable("job_listings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  description: text("description"),
  requiredSkills: text("required_skills").array().notNull().default([]),
  sourceUrl: text("source_url").notNull().unique(),
  domain: text("domain"), // e.g. "Software Engineering", "Data Science"
  postedAt: timestamp("posted_at", { withTimezone: true }),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertJobListingSchema = createInsertSchema(jobListingsTable).omit({ id: true });
export type InsertJobListing = z.infer<typeof insertJobListingSchema>;
export type JobListing = typeof jobListingsTable.$inferSelect;
