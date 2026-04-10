import { scrapeAllSources } from "../artifacts/api-server/src/services/job-intelligence/scraper";
import { analyzeTrends } from "../artifacts/api-server/src/services/job-intelligence/trendAnalyzer";
import { logger } from "../artifacts/api-server/src/lib/logger";

async function main() {
  logger.info("Starting standalone scraping process...");
  
  try {
    const scrapeResult = await scrapeAllSources();
    logger.info({ 
      total: scrapeResult.total, 
      success: scrapeResult.success, 
      failed: scrapeResult.failed 
    }, "Scraping completed");

    logger.info("Running trend analysis...");
    const trends = await analyzeTrends();
    logger.info({ 
      techs: trends.top_technologies.length, 
      jobs: trends.total_jobs_analyzed 
    }, "Trend analysis completed");

    logger.info("Job scraping and analysis finished successfully.");
    process.exit(0);
  } catch (error: any) {
    logger.error({ error: error.message }, "Script failed");
    process.exit(1);
  }
}

main();
