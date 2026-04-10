import { db, jobListingsTable, trendSkillsTable, trendRolesTable } from "@workspace/db";
import { gt, eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function extractAndSyncTrends() {
  logger.info("Starting trend extraction from job listings...");

  const recentJobs = await db.select().from(jobListingsTable).where(gt(jobListingsTable.fetchedAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

  if (recentJobs.length === 0) {
    logger.info("No recent jobs to process for trends.");
    return;
  }

  const skillCounts: Record<string, number> = {};
  const roleCounts: Record<string, number> = {};

  for (const job of recentJobs) {
    // Process skills
    for (const skill of job.requiredSkills) {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    }

    // Process roles (using job title as a proxy for role)
    const normalizedTitle = normalizeJobTitle(job.title);
    roleCounts[normalizedTitle] = (roleCounts[normalizedTitle] || 0) + 1;
  }

  // Upsert into trend_skills
  for (const [name, count] of Object.entries(skillCounts)) {
    await db.insert(trendSkillsTable).values({
      name,
      demandCount: count,
      lastSeenAt: new Date(),
    }).onConflictDoUpdate({
      target: trendSkillsTable.name,
      set: { 
        demandCount: sql`${trendSkillsTable.demandCount} + ${count}`,
        lastSeenAt: new Date()
      }
    });
  }

  // Upsert into trend_roles
  for (const [title, count] of Object.entries(roleCounts)) {
    await db.insert(trendRolesTable).values({
      title,
      demandCount: count,
      lastSeenAt: new Date(),
    }).onConflictDoUpdate({
      target: trendRolesTable.title,
      set: { 
        demandCount: sql`${trendRolesTable.demandCount} + ${count}`,
        lastSeenAt: new Date()
      }
    });
  }

  logger.info("Trend extraction completed.");
}

function normalizeJobTitle(title: string): string {
  // Simple normalization: extract core role from common suffixes
  let role = title.split("|")[0].split("-")[0].split("(")[0].trim();
  role = role.replace(/(Senior|Junior|Lead|Principal|Staff|Graduate|Trainee|Intermediate)/gi, "").trim();
  return role || title;
}
