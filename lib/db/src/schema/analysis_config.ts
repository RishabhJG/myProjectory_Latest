import { mysqlTable, int, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const analysisConfigTable = mysqlTable("analysis_config", {
  id: int("id").autoincrement().primaryKey(),
  projectsWeight: int("projects_weight").notNull().default(15),
  skillsWeight: int("skills_weight").notNull().default(35),
  certificationsWeight: int("certifications_weight").notNull().default(0), // Currently certifications are skipped, weighted to 0
  trendAlignmentWeight: int("trend_alignment_weight").notNull().default(25),
  roadmapCompletionWeight: int("roadmap_completion_weight").notNull().default(25),
  executionProgressWeight: int("execution_progress_weight").notNull().default(0), // Optional
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAnalysisConfigSchema = createInsertSchema(analysisConfigTable).omit({ id: true, updatedAt: true });
export type InsertAnalysisConfig = z.infer<typeof insertAnalysisConfigSchema>;
export type AnalysisConfig = typeof analysisConfigTable.$inferSelect;
