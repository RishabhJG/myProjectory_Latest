import { mysqlTable, varchar, int, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

// ─── S3.4: Per-User Scoring Weights ──────────────────────────────────────────

export const userScoreWeightsTable = mysqlTable("user_score_weights", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  dimension: varchar("dimension", { length: 255 }).notNull(), // "projects" | "skills" | "certifications" | "trendAlignment" | "roadmapCompletion" | "executionProgress"
  weight: int("weight").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserScoreWeightSchema = createInsertSchema(userScoreWeightsTable).omit({ id: true, updatedAt: true }).strict() as unknown as z.ZodType<any, z.ZodTypeDef, any>;
export type InsertUserScoreWeight = z.infer<typeof insertUserScoreWeightSchema>;
export type UserScoreWeight = typeof userScoreWeightsTable.$inferSelect;
