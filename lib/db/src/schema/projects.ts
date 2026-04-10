import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  problemSolved: text("problem_solved"),
  technologies: text("technologies").array().notNull().default([]),
  difficultyLevel: text("difficulty_level").notNull().default("beginner"),
  githubLink: text("github_link"),
  liveLink: text("live_link"),
  screenshotUrl: text("screenshot_url"),
  duration: text("duration"),
  role: text("role"),
  category: text("category"),
  completionStatus: text("completion_status").notNull().default("planning"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
