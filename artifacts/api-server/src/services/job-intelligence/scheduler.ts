/**
 * Job Intelligence Scheduler
 *
 * Optional cron-based scheduling for periodic job scraping and trend analysis.
 * Uses the existing node-cron dependency.
 */

import cron from "node-cron";
import { scrapeAllSources } from "./scraper";
import { analyzeTrends } from "./trendAnalyzer";
import { logger } from "../../lib/logger";

const JOB_INTEL_SYNC_INTERVAL = process.env.JOB_INTEL_SYNC_INTERVAL || "0 */6 * * *"; // Default: Every 6 hours

/**
 * Initialize the job intelligence cron scheduler.
 * Only runs if JOB_INTEL_SCHEDULER_ENABLED is set to "true".
 */
export function initializeJobIntelligenceScheduler(): void {
  if (process.env.JOB_INTEL_SCHEDULER_ENABLED !== "true") {
    logger.info("Job Intelligence scheduler is disabled. Set JOB_INTEL_SCHEDULER_ENABLED=true to enable.");
    return;
  }

  logger.info(
    { interval: JOB_INTEL_SYNC_INTERVAL },
    "Initializing Job Intelligence scheduler",
  );

  cron.schedule(JOB_INTEL_SYNC_INTERVAL, async () => {
    logger.info("Cron: Starting scheduled Job Intelligence sync...");
    try {
      const scrapeResult = await scrapeAllSources();
      logger.info(
        { success: scrapeResult.success, failed: scrapeResult.failed },
        "Cron: Scraping phase completed",
      );

      const trendResult = await analyzeTrends();
      logger.info(
        {
          totalJobs: trendResult.total_jobs_analyzed,
          topTechs: trendResult.top_technologies.map((t) => t.name),
        },
        "Cron: Trend analysis completed",
      );
    } catch (error) {
      logger.error({ error }, "Cron: Job Intelligence sync failed");
    }
  });
}
