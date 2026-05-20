import { mysqlTable, varchar, int, timestamp, json, float } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Scraped Job Postings (Job Market Intelligence) ─────────────────────────

export const scrapedJobPostingsTable = mysqlTable("scraped_job_postings", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  experience: varchar("experience", { length: 255 }),
  employmentType: varchar("employment_type", { length: 100 }),
  description: varchar("description", { length: 4096 }),
  // MySQL has no native array type — stored as JSON
  extractedStack: json("extracted_stack").$type<string[]>().notNull().default([]),
  postedDate: timestamp("posted_date"),
  // UNIQUE URL: MySQL utf8mb4 allows max 768 chars for indexed varchar (768*4=3072 bytes)
  sourceUrl: varchar("source_url", { length: 768 }).notNull().unique(),
  sourcePlatform: varchar("source_platform", { length: 255 }).notNull().default("generic"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertScrapedJobPostingSchema = createInsertSchema(scrapedJobPostingsTable).omit({ id: true, createdAt: true });
export type InsertScrapedJobPosting = z.infer<typeof insertScrapedJobPostingSchema>;
export type ScrapedJobPosting = typeof scrapedJobPostingsTable.$inferSelect;

// ─── Tech Trends (aggregated from scraped data) ─────────────────────────────

export const techTrendsTable = mysqlTable("tech_trends", {
  id: int("id").autoincrement().primaryKey(),
  technology: varchar("technology", { length: 255 }).notNull().unique(),
  frequency: int("frequency").notNull().default(0),
  trendRank: int("trend_rank"),
  percentageShare: float("percentage_share"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTechTrendSchema = createInsertSchema(techTrendsTable).omit({ id: true });
export type InsertTechTrend = z.infer<typeof insertTechTrendSchema>;
export type TechTrend = typeof techTrendsTable.$inferSelect;
