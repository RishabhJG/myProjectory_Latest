
import { scrapeAllSources } from "../artifacts/api-server/src/services/job-intelligence/scraper";
import { analyzeTrends } from "../artifacts/api-server/src/services/job-intelligence/trendAnalyzer";
import { db, scrapedJobPostingsTable, techTrendsTable } from "../lib/db/src";

async function run() {
  console.log("--- Manual Scrape Verification Start ---");
  
  // 1. Clear old trends and jobs to ensure a fresh test (Optional, but good for verification)
  // console.log("Clearing old data for clean test...");
  // await db.delete(techTrendsTable);
  // await db.delete(scrapedJobPostingsTable);

  // 2. Run Scraping
  console.log("Starting scrape of job sources...");
  const scrapeResult = await scrapeAllSources();
  console.log(`Scrape Summary: Total=${scrapeResult.total}, Success=${scrapeResult.success}, Failed=${scrapeResult.failed}`);
  
  // 3. Run Analysis
  console.log("\nStarting trend analysis...");
  const trends = await analyzeTrends();
  console.log(`Analysis Summary: Analyzed ${trends.total_jobs_analyzed} jobs.`);
  
  // 4. Verification
  console.log("\nTop 5 Trending Technologies Found:");
  trends.top_technologies.forEach((t, i) => {
    console.log(`${i + 1}. ${t.name}: ${t.count} mentions (${t.percentage}%)`);
  });

  console.log("\nTop 3 Stack Combinations:");
  trends.top_stack_combinations.forEach((c, i) => {
    console.log(`${i + 1}. ${c.stack}: ${c.count} matches`);
  });

  console.log("\n--- Manual Scrape Verification End ---");
  process.exit(0);
}

run().catch(err => {
  console.error("Verification Trial Failed:", err);
  process.exit(1);
});
