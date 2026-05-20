import { mysqlTable, varchar, int, timestamp, tinyint } from "drizzle-orm/mysql-core";

export const domainsTable = mysqlTable("domains", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: varchar("description", { length: 1024 }).notNull(),
  priority: int("priority").notNull().default(0),
  isVisible: tinyint("is_visible").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Domain = typeof domainsTable.$inferSelect;
export type InsertDomain = typeof domainsTable.$inferInsert;

export const domainCategoriesTable = mysqlTable("domain_categories", {
  id: int("id").autoincrement().primaryKey(),
  domainId: int("domain_id").notNull().references(() => domainsTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertDomainCategory = typeof domainCategoriesTable.$inferInsert;

export const domainRoleMapTable = mysqlTable("domain_role_map", {
  id: int("id").autoincrement().primaryKey(),
  domainId: int("domain_id").notNull().references(() => domainsTable.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 255 }).notNull(),
});

export type InsertDomainRoleMap = typeof domainRoleMapTable.$inferInsert;

export const domainSkillMapTable = mysqlTable("domain_skill_map", {
  id: int("id").autoincrement().primaryKey(),
  domainId: int("domain_id").notNull().references(() => domainsTable.id, { onDelete: "cascade" }),
  skill: varchar("skill", { length: 255 }).notNull(),
});

export type InsertDomainSkillMap = typeof domainSkillMapTable.$inferInsert;
