import { mysqlTable, varchar, int, timestamp, tinyint, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";
import { projectsTable } from "./projects";
import { roadmapsTable } from "./roadmaps";

// ─── Portfolio Visibility Enum ───────────────────────────────────────────────

export const portfolioVisibilityEnum = mysqlEnum("visibility", ["public", "private"]);

// ─── Portfolios ─────────────────────────────────────────────────────────────

export const portfoliosTable = mysqlTable("portfolios", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 512 }).notNull(),
  bio: varchar("bio", { length: 2048 }),
  avatarUrl: varchar("avatar_url", { length: 2048 }),
  theme: varchar("theme", { length: 255 }).notNull().default("default"),
  // mysqlEnum used inline for the visibility column
  visibility: mysqlEnum("portfolio_visibility", ["public", "private"]).notNull().default("private"),
  slug: varchar("slug", { length: 512 }).notNull().unique(),
  // UUID stored as varchar(36) in MySQL
  shareToken: varchar("share_token", { length: 36 }).notNull().unique(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPortfolioSchema = createInsertSchema(portfoliosTable).omit({ id: true, createdAt: true, updatedAt: true }).strict() as unknown as z.ZodType<any, z.ZodTypeDef, any>;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfoliosTable.$inferSelect;

// ─── Portfolio Projects ─────────────────────────────────────────────────────

export const portfolioProjectsTable = mysqlTable("portfolio_projects", {
  id: int("id").autoincrement().primaryKey(),
  portfolioId: int("portfolio_id").notNull().references(() => portfoliosTable.id, { onDelete: "cascade" }),
  projectId: int("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  displayOrder: int("display_order").notNull().default(0),
  isFeatured: tinyint("is_featured").notNull().default(0),
});

export const insertPortfolioProjectSchema = createInsertSchema(portfolioProjectsTable).omit({ id: true }).strict() as unknown as z.ZodType<any, z.ZodTypeDef, any>;
export type InsertPortfolioProject = z.infer<typeof insertPortfolioProjectSchema>;
export type PortfolioProject = typeof portfolioProjectsTable.$inferSelect;

// ─── S2.4: User Skills ────────────────────────────────────────────────────────

export const userSkillsTable = mysqlTable("user_skills", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  proficiencyLevel: varchar("proficiency_level", { length: 100 }).notNull().default("beginner"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSkillSchema = createInsertSchema(userSkillsTable).omit({ id: true, createdAt: true }).strict() as unknown as z.ZodType<any, z.ZodTypeDef, any>;
export type InsertUserSkill = z.infer<typeof insertUserSkillSchema>;
export type UserSkill = typeof userSkillsTable.$inferSelect;

// ─── S2.4: User Certifications ────────────────────────────────────────────────

export const userCertificationsTable = mysqlTable("user_certifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  issuingBody: varchar("issuing_body", { length: 255 }).notNull(),
  dateObtained: varchar("date_obtained", { length: 100 }),
  url: varchar("url", { length: 2048 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserCertificationSchema = createInsertSchema(userCertificationsTable).omit({ id: true, createdAt: true }).strict() as unknown as z.ZodType<any, z.ZodTypeDef, any>;
export type InsertUserCertification = z.infer<typeof insertUserCertificationSchema>;
export type UserCertification = typeof userCertificationsTable.$inferSelect;

// ─── S2.5: Project-Stack Tags ─────────────────────────────────────────────────

export const projectStackTagsTable = mysqlTable("project_stack_tags", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  stackId: int("stack_id").notNull().references(() => roadmapsTable.id, { onDelete: "cascade" }),
  taggedAt: timestamp("tagged_at").notNull().defaultNow(),
});

export const insertProjectStackTagSchema = createInsertSchema(projectStackTagsTable).omit({ id: true, taggedAt: true }).strict() as unknown as z.ZodType<any, z.ZodTypeDef, any>;
export type InsertProjectStackTag = z.infer<typeof insertProjectStackTagSchema>;
export type ProjectStackTag = typeof projectStackTagsTable.$inferSelect;
