import { mysqlTable, varchar, int, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { domainsTable } from "./domains";
import { roadmapsTable } from "./roadmaps";

// ─── S5.11: Stack-Roadmap Mapping ─────────────────────────────────────────────

export const stackRoadmapMapTable = mysqlTable("stack_roadmap_map", {
  id: int("id").autoincrement().primaryKey(),
  stackId: int("stack_id").notNull().references(() => domainsTable.id, { onDelete: "cascade" }),
  roadmapId: int("roadmap_id").notNull().references(() => roadmapsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStackRoadmapMapSchema = createInsertSchema(stackRoadmapMapTable).omit({ id: true, createdAt: true });
export type InsertStackRoadmapMap = z.infer<typeof insertStackRoadmapMapSchema>;
export type StackRoadmapMap = typeof stackRoadmapMapTable.$inferSelect;
