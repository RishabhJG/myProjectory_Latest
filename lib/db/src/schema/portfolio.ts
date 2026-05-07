import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";
import { projectsTable } from "./projects";
import { roadmapsTable } from "./roadmaps";

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

// ─── Portfolio Sharing ──────────────────────────────────────────────────────

export const portfolioSharesTable = pgTable("portfolio_shares", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  shareId: text("share_id").notNull().unique(),
  visibility: text("visibility").notNull().default("private"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPortfolioShareSchema = createInsertSchema(portfolioSharesTable)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPortfolioShare = z.infer<typeof insertPortfolioShareSchema>;
export type PortfolioShare = typeof portfolioSharesTable.$inferSelect;
