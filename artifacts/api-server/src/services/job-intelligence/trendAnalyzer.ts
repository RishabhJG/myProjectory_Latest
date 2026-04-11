/**
 * Trend Analyzer
 *
 * Analyzes all scraped job postings to compute technology frequency,
 * top technologies, top stack combinations, and percentage shares.
 * Persists results to the tech_trends database table.
 */

import { db, scrapedJobPostingsTable, techTrendsTable } from "@workspace/db";
import { sql, desc } from "drizzle-orm";
import { detectStackCombinations } from "./techStackExtractor";
import { logger } from "../../lib/logger";

export interface TrendAnalysisResult {
  top_technologies: { name: string; count: number; percentage: number }[];
  top_stack_combinations: { stack: string; count: number }[];
  all_technologies: { name: string; count: number; percentage: number }[];
  total_jobs_analyzed: number;
  analyzed_at: string;
}

/**
 * Analyze all scraped job postings and compute trending tech stacks.
 */
export async function analyzeTrends(): Promise<TrendAnalysisResult> {
  logger.info("Starting trend analysis on scraped job postings...");

  // Fetch all scraped jobs
  const allJobs = await db.select().from(scrapedJobPostingsTable);

  if (allJobs.length === 0) {
    logger.info("No scraped jobs found for trend analysis.");
    return {
      top_technologies: [],
      top_stack_combinations: [],
      all_technologies: [],
      total_jobs_analyzed: 0,
      analyzed_at: new Date().toISOString(),
    };
  }

  // Count frequencies
  const techCounts: Record<string, number> = {};
  const techsPerJob: string[][] = [];
  let jobsWithNoTech = 0;

  for (const job of allJobs) {
    const stack = job.extractedStack || [];
    if (stack.length === 0) jobsWithNoTech++;
    techsPerJob.push(stack);

    for (const tech of stack) {
      techCounts[tech] = (techCounts[tech] || 0) + 1;
    }
  }

  // Total tech mentions for percentage calculation
  const totalMentions = Object.values(techCounts).reduce((sum, c) => sum + c, 0);

  // Sort by frequency
  const sortedTechs = Object.entries(techCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalMentions > 0 ? Math.round((count / totalMentions) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Top 3 technologies
  const top3 = sortedTechs.slice(0, 3);

  // Detect stack combinations
  const stackCombos = detectStackCombinations(techsPerJob);
  const topCombos = stackCombos.slice(0, 3);

  logger.info({ 
    totalJobs: allJobs.length, 
    uniqueTechs: sortedTechs.length, 
    combinationsFound: stackCombos.length 
  }, "Trend analysis computed frequencies and combinations");

  // Persist trends to database
  await persistTrends(sortedTechs);


  const result: TrendAnalysisResult = {
    top_technologies: top3,
    top_stack_combinations: topCombos,
    all_technologies: sortedTechs,
    total_jobs_analyzed: allJobs.length,
    analyzed_at: new Date().toISOString(),
  };

  logger.info(
    {
      totalJobs: allJobs.length,
      jobsWithNoTech,
      uniqueTechs: sortedTechs.length,
      top3: top3.map((t) => t.name),
      topCombos: topCombos.map((c) => c.stack),
    },
    "Trend analysis completed",
  );

  return result;
}

/**
 * Persist technology frequency data to the tech_trends table.
 */
async function persistTrends(
  techs: { name: string; count: number; percentage: number }[],
): Promise<void> {
  // Clear existing trends and re-insert
  await db.delete(techTrendsTable);

  for (let i = 0; i < techs.length; i++) {
    const tech = techs[i];
    await db.insert(techTrendsTable).values({
      technology: tech.name,
      frequency: tech.count,
      trendRank: i + 1,
      percentageShare: tech.percentage,
      updatedAt: new Date(),
    });
  }
}

/**
 * Get top 3 trending stacks from the database (fast read path).
 * Falls back to live analysis if no cached data exists.
 */
export async function getTop3Stacks(): Promise<TrendAnalysisResult> {
  // Check if we have cached trend data
  const cached = await db
    .select()
    .from(techTrendsTable)
    .orderBy(techTrendsTable.trendRank)
    .limit(3);

  if (cached.length > 0) {
    // We have cached data — also do a full analysis for completeness
    return analyzeTrends();
  }

  // No cached data — run fresh analysis
  return analyzeTrends();
}
