import { mysqlTable, varchar, int, timestamp, json } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const jobsTable = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  experience: varchar("experience", { length: 255 }),
  // MySQL has no native array type — stored as JSON
  requiredSkills: json("required_skills").$type<string[]>().notNull().default([]),
  salary: varchar("salary", { length: 255 }),
  applyLink: varchar("apply_link", { length: 2048 }),
  source: varchar("source", { length: 255 }).notNull().default("CareerStack"),
  postedAt: timestamp("posted_at").notNull().defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true }).strict() as unknown as z.ZodType<any, z.ZodTypeDef, any>;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
