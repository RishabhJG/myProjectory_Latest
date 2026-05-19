import { pgTable, text, serial, integer, timestamp, boolean, pgEnum, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";
import { projectsTable } from "./projects";
import { roadmapsTable } from "./roadmaps";

// ─── Portfolio Visibility Enum ───────────────────────────────────────────────

export const portfolioVisibilityEnum = pgEnum("portfolio_visibility", ["public", "private"]);

// ─── Portfolios ─────────────────────────────────────────────────────────────

export const portfoliosTable = pgTable("portfolios", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  theme: text("theme").notNull().default("default"),
  visibility: portfolioVisibilityEnum("visibility").notNull().default("private"),
  slug: text("slug").notNull().unique(),
  shareToken: uuid("share_token").notNull().unique(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPortfolioSchema = createInsertSchema(portfoliosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfoliosTable.$inferSelect;

// ─── Portfolio Projects ─────────────────────────────────────────────────────

export const portfolioProjectsTable = pgTable("portfolio_projects", {
  id: serial("id").primaryKey(),
  portfolioId: integer("portfolio_id").notNull().references(() => portfoliosTable.id, { onDelete: "cascade" }),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  displayOrder: integer("display_order").notNull().default(0),
  isFeatured: boolean("is_featured").notNull().default(false),
});

export const insertPortfolioProjectSchema = createInsertSchema(portfolioProjectsTable).omit({ id: true });
export type InsertPortfolioProject = z.infer<typeof insertPortfolioProjectSchema>;
export type PortfolioProject = typeof portfolioProjectsTable.$inferSelect;

// ─── S2.4: User Skills ────────────────────────────────────────────────────────

export const userSkillsTable = pgTable("user_skills", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  proficiencyLevel: text("proficiency_level").notNull().default("beginner"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSkillSchema = createInsertSchema(userSkillsTable).omit({ id: true, createdAt: true });
export type InsertUserSkill = z.infer<typeof insertUserSkillSchema>;
export type UserSkill = typeof userSkillsTable.$inferSelect;

// ─── S2.4: User Certifications ────────────────────────────────────────────────

export const userCertificationsTable = pgTable("user_certifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  issuingBody: text("issuing_body").notNull(),
  dateObtained: text("date_obtained"),
  url: text("url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserCertificationSchema = createInsertSchema(userCertificationsTable).omit({ id: true, createdAt: true });
export type InsertUserCertification = z.infer<typeof insertUserCertificationSchema>;
export type UserCertification = typeof userCertificationsTable.$inferSelect;

// ─── S2.5: Project-Stack Tags ─────────────────────────────────────────────────

export const projectStackTagsTable = pgTable("project_stack_tags", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  stackId: integer("stack_id").notNull().references(() => roadmapsTable.id, { onDelete: "cascade" }),
  taggedAt: timestamp("tagged_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectStackTagSchema = createInsertSchema(projectStackTagsTable).omit({ id: true, taggedAt: true });
export type InsertProjectStackTag = z.infer<typeof insertProjectStackTagSchema>;
export type ProjectStackTag = typeof projectStackTagsTable.$inferSelect;
