import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const domainsTable = pgTable("domains", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  priority: integer("priority").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Domain = typeof domainsTable.$inferSelect;
export type InsertDomain = typeof domainsTable.$inferInsert;

export const domainCategoriesTable = pgTable("domain_categories", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").notNull().references(() => domainsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InsertDomainCategory = typeof domainCategoriesTable.$inferInsert;

export const domainRoleMapTable = pgTable("domain_role_map", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").notNull().references(() => domainsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
});

export type InsertDomainRoleMap = typeof domainRoleMapTable.$inferInsert;

export const domainSkillMapTable = pgTable("domain_skill_map", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").notNull().references(() => domainsTable.id, { onDelete: "cascade" }),
  skill: text("skill").notNull(),
});

export type InsertDomainSkillMap = typeof domainSkillMapTable.$inferInsert;
