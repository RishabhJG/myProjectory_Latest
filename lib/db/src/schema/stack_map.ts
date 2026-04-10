import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { domainsTable } from "./domains";
import { roadmapsTable } from "./roadmaps";

// ─── S5.11: Stack-Roadmap Mapping ─────────────────────────────────────────────

export const stackRoadmapMapTable = pgTable("stack_roadmap_map", {
  id: serial("id").primaryKey(),
  stackId: integer("stack_id").notNull().references(() => domainsTable.id, { onDelete: "cascade" }),
  roadmapId: integer("roadmap_id").notNull().references(() => roadmapsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStackRoadmapMapSchema = createInsertSchema(stackRoadmapMapTable).omit({ id: true, createdAt: true });
export type InsertStackRoadmapMap = z.infer<typeof insertStackRoadmapMapSchema>;
export type StackRoadmapMap = typeof stackRoadmapMapTable.$inferSelect;
