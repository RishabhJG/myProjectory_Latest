import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const trendSkillsTable = pgTable("trend_skills", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  demandCount: integer("demand_count").notNull().default(0),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trendRolesTable = pgTable("trend_roles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().unique(),
  demandCount: integer("demand_count").notNull().default(0),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TrendSkill = typeof trendSkillsTable.$inferSelect;
export type TrendRole = typeof trendRolesTable.$inferSelect;
