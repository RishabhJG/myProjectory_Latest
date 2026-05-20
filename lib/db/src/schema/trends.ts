import { mysqlTable, varchar, int, timestamp } from "drizzle-orm/mysql-core";

export const trendSkillsTable = mysqlTable("trend_skills", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  demandCount: int("demand_count").notNull().default(0),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

export const trendRolesTable = mysqlTable("trend_roles", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 512 }).notNull().unique(),
  demandCount: int("demand_count").notNull().default(0),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

export type TrendSkill = typeof trendSkillsTable.$inferSelect;
export type TrendRole = typeof trendRolesTable.$inferSelect;
