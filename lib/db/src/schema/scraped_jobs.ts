import { pgTable, text, serial, integer, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Scraped Job Postings (Job Market Intelligence) ─────────────────────────

export const scrapedJobPostingsTable = pgTable("scraped_job_postings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  experience: text("experience"),
  employmentType: text("employment_type"),
  description: text("description"),
  extractedStack: text("extracted_stack").array().notNull().default([]),
  postedDate: timestamp("posted_date", { withTimezone: true }),
  sourceUrl: text("source_url").notNull().unique(),
  sourcePlatform: text("source_platform").notNull().default("generic"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScrapedJobPostingSchema = createInsertSchema(scrapedJobPostingsTable).omit({ id: true, createdAt: true });
export type InsertScrapedJobPosting = z.infer<typeof insertScrapedJobPostingSchema>;
export type ScrapedJobPosting = typeof scrapedJobPostingsTable.$inferSelect;

// ─── Tech Trends (aggregated from scraped data) ─────────────────────────────

export const techTrendsTable = pgTable("tech_trends", {
  id: serial("id").primaryKey(),
  technology: text("technology").notNull().unique(),
  frequency: integer("frequency").notNull().default(0),
  trendRank: integer("trend_rank"),
  percentageShare: real("percentage_share"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTechTrendSchema = createInsertSchema(techTrendsTable).omit({ id: true });
export type InsertTechTrend = z.infer<typeof insertTechTrendSchema>;
export type TechTrend = typeof techTrendsTable.$inferSelect;
