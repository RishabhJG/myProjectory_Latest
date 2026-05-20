import { mysqlTable, varchar, int, timestamp, tinyint, json } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const jobListingsTable = mysqlTable("job_listings", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  description: varchar("description", { length: 4096 }),
  // MySQL has no native array type — stored as JSON
  requiredSkills: json("required_skills").$type<string[]>().notNull().default([]),
  // UNIQUE URL: MySQL utf8mb4 allows max 768 chars for indexed varchar (768*4=3072 bytes)
  sourceUrl: varchar("source_url", { length: 768 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }), // e.g. "Software Engineering", "Data Science"
  postedAt: timestamp("posted_at"),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  isActive: tinyint("is_active").notNull().default(1),
});

export const insertJobListingSchema = createInsertSchema(jobListingsTable).omit({ id: true });
export type InsertJobListing = z.infer<typeof insertJobListingSchema>;
export type JobListing = typeof jobListingsTable.$inferSelect;
