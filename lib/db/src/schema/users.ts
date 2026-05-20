import { mysqlTable, varchar, int, timestamp, json } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const usersTable = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 512 }).notNull(),
  email: varchar("email", { length: 512 }).notNull(),
  college: varchar("college", { length: 512 }),
  degree: varchar("degree", { length: 512 }),
  graduationYear: int("graduation_year"),
  careerGoal: varchar("career_goal", { length: 512 }),
  preferredDomain: varchar("preferred_domain", { length: 255 }),
  // MySQL has no native array type — stored as JSON
  interests: json("interests").$type<string[]>().notNull().default([]),
  skills: json("skills").$type<string[]>().notNull().default([]),
  profilePhotoUrl: varchar("profile_photo_url", { length: 2048 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
