import { mysqlTable, varchar, int, tinyint, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const roadmapsTable = mysqlTable("roadmaps", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  technology: varchar("technology", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const milestonesTable = mysqlTable("milestones", {
  id: int("id").autoincrement().primaryKey(),
  roadmapId: int("roadmap_id").notNull().references(() => roadmapsTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 512 }).notNull(),
  description: varchar("description", { length: 4096 }),
  orderIndex: int("order_index").notNull().default(0),
  estimatedDuration: varchar("estimated_duration", { length: 255 }).notNull().default("1 week"),
  industryRelevance: varchar("industry_relevance", { length: 100 }).notNull().default("Medium"),
  status: varchar("status", { length: 100 }).notNull().default("not_started"),
});

export const tasksTable = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  milestoneId: int("milestone_id").notNull().references(() => milestonesTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 512 }).notNull(),
  completed: tinyint("completed").notNull().default(0),
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
