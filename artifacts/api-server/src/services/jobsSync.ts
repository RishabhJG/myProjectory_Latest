import cron from "node-cron";
import { fetchAndStoreJobs } from "./jobFetcher";
import { extractAndSyncTrends } from "./trendExtractor";
import { logger } from "../lib/logger";

const SYNC_INTERVAL = process.env.JOBS_SYNC_INTERVAL || "0 0 * * *"; // Default: Daily at midnight

export function initializeJobsSync() {
  logger.info({ interval: SYNC_INTERVAL }, "Initializing daily jobs synchronization cron");

  cron.schedule(SYNC_INTERVAL, async () => {
    logger.info("Cron: Starting scheduled jobs sync...");
    try {
      await fetchAndStoreJobs();
      await extractAndSyncTrends();
      logger.info("Cron: Scheduled jobs sync completed successfully.");
    } catch (error) {
      logger.error({ error }, "Cron: Scheduled jobs sync failed.");
    }
  });

  // Optional: Run once on startup in development
  if (process.env.NODE_ENV === "development" && process.env.RUN_SYNC_ON_STARTUP === "true") {
    logger.info("Development: Running immediate job sync on startup...");
    fetchAndStoreJobs().then(() => extractAndSyncTrends());
  }
}
