
import { db, scrapedJobPostingsTable, techTrendsTable } from "./lib/db/src";

async function check() {
  console.log("--- Database Diagnostic Start ---");
  
  try {
    const jobs = await db.select().from(scrapedJobPostingsTable);
    console.log("Total Scraped Jobs:", jobs.length);
    
    if (jobs.length > 0) {
      console.log("Sample Job Tech Stacks (Top 5):");
      jobs.slice(-5).forEach(j => {
        console.log(`- [${j.id}] ${j.title} (${j.company}): ${JSON.stringify(j.extractedStack)}`);
        // console.log(`  URL: ${j.sourceUrl}`);
      });
    } else {
      console.log("No jobs found in scraped_job_postings table.");
    }
    
    const trends = await db.select().from(techTrendsTable).orderBy(techTrendsTable.trendRank);
    console.log("\nCurrent Tech Trends (from tech_trends table):");
    if (trends.length > 0) {
      trends.forEach(t => {
        console.log(`- #${t.trendRank} ${t.technology}: ${t.frequency} mentions (${t.percentageShare}%)`);
      });
    } else {
      console.log("No trends found in tech_trends table.");
    }
    
    console.log("\n--- Database Diagnostic End ---");
  } catch (error: any) {
    console.error("Diagnostic Error:", error.message);
  }
  process.exit(0);
}

check();
