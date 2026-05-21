import { mysqlTable, varchar, int, timestamp, json, date } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const projectsTable = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 512 }).notNull(),
  description: varchar("description", { length: 4096 }),
  problemSolved: varchar("problem_solved", { length: 4096 }),
  // MySQL has no native array type — stored as JSON
  technologies: json("technologies").$type<string[]>().notNull().default([]),
  difficultyLevel: varchar("difficulty_level", { length: 100 }).notNull().default("beginner"),
  githubLink: varchar("github_link", { length: 2048 }),
  liveLink: varchar("live_link", { length: 2048 }),
  screenshotUrl: varchar("screenshot_url", { length: 2048 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  duration: varchar("duration", { length: 255 }),
  role: varchar("role", { length: 255 }),
  category: varchar("category", { length: 255 }),
  completionStatus: varchar("completion_status", { length: 100 }).notNull().default("planning"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true }).strict() as unknown as z.ZodType<any, z.ZodTypeDef, any>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
