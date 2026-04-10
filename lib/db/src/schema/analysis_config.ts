import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const analysisConfigTable = pgTable("analysis_config", {
  id: serial("id").primaryKey(),
  projectsWeight: integer("projects_weight").notNull().default(15),
  skillsWeight: integer("skills_weight").notNull().default(35),
  certificationsWeight: integer("certifications_weight").notNull().default(0), // Currently certifications are skipped, weighted to 0
  trendAlignmentWeight: integer("trend_alignment_weight").notNull().default(25),
  roadmapCompletionWeight: integer("roadmap_completion_weight").notNull().default(25),
  executionProgressWeight: integer("execution_progress_weight").notNull().default(0), // Optional
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAnalysisConfigSchema = createInsertSchema(analysisConfigTable).omit({ id: true, updatedAt: true });
export type InsertAnalysisConfig = z.infer<typeof insertAnalysisConfigSchema>;
export type AnalysisConfig = typeof analysisConfigTable.$inferSelect;
