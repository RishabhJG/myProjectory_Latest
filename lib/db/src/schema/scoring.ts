import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

// ─── S3.4: Per-User Scoring Weights ──────────────────────────────────────────

export const userScoreWeightsTable = pgTable("user_score_weights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  dimension: text("dimension").notNull(), // "projects" | "skills" | "certifications" | "trendAlignment" | "roadmapCompletion" | "executionProgress"
  weight: integer("weight").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserScoreWeightSchema = createInsertSchema(userScoreWeightsTable).omit({ id: true, updatedAt: true });
export type InsertUserScoreWeight = z.infer<typeof insertUserScoreWeightSchema>;
export type UserScoreWeight = typeof userScoreWeightsTable.$inferSelect;
