import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const roadmapsTable = pgTable("roadmaps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  technology: text("technology").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const milestonesTable = pgTable("milestones", {
  id: serial("id").primaryKey(),
  roadmapId: integer("roadmap_id").notNull().references(() => roadmapsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  estimatedDuration: text("estimated_duration").notNull().default("1 week"),
  industryRelevance: text("industry_relevance").notNull().default("Medium"),
  status: text("status").notNull().default("not_started"),
});

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  milestoneId: integer("milestone_id").notNull().references(() => milestonesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
});

export const insertRoadmapSchema = createInsertSchema(roadmapsTable).omit({ id: true, createdAt: true });
export type InsertRoadmap = z.infer<typeof insertRoadmapSchema>;
export type Roadmap = typeof roadmapsTable.$inferSelect;

export const insertMilestoneSchema = createInsertSchema(milestonesTable).omit({ id: true });
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type MilestoneRow = typeof milestonesTable.$inferSelect;

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type TaskRow = typeof tasksTable.$inferSelect;
