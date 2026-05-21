/**
 * Job Scraper Orchestrator
 *
 * Reads URLs from job_sources.json, scrapes each one,
 * and stores results in the scraped_job_postings table.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { db, scrapedJobPostingsTable, type InsertScrapedJobPosting } from "@workspace/db";
import { sql } from "drizzle-orm";
import { parseJobUrl, type ScrapedJobData } from "./parser";
import { logger } from "../../lib/logger";
import { isNaukriListingUrl, scrapeNaukriListingPage } from "./naukriScraper";

// Robust path resolution for config file
function resolveConfigPath(): string {
  const cwd = process.cwd();
  const pathsToTry = [
    // If running from api-server directory
    join(cwd, "config/job_sources.json"),
    // If running from project root
    join(cwd, "artifacts/api-server/config/job_sources.json"),
    // Fallback based on __dirname (when bundled in dist)
    // __dirname is usually artifacts/api-server/dist
    join(__dirname, "../config/job_sources.json"),
    // Hardcoded absolute path as last resort (based on common project structure)
    resolve(cwd, "artifacts/api-server/config/job_sources.json")
  ];

  for (const p of pathsToTry) {
    if (existsSync(p)) {
      return p;
    }
  }

  // Default to the most likely development path if none exist
  return pathsToTry[1];
}

const CONFIG_PATH = resolveConfigPath();

interface JobSourcesConfig {
  urls: string[];
  platforms: Record<string, { enabled: boolean }>;
}

/**
 * Load job source URLs from the config file.
 */
export function loadJobSources(): JobSourcesConfig {
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as JobSourcesConfig;
  } catch (error: any) {
    logger.warn({ error: error.message }, "Failed to read job_sources.json, using empty config");
    return { urls: [], platforms: {} };
  }
}

/**
 * Add a new URL to the config file.
 */
export function addJobSource(url: string): { success: boolean; message: string } {
  try {
    const config = loadJobSources();

    if (config.urls.includes(url)) {
      return { success: false, message: "URL already exists in config" };
    }

    config.urls.push(url);
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
    return { success: true, message: "URL added successfully" };
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to add job source");
    return { success: false, message: `Failed to add URL: ${error.message}` };
  }
}

/**
 * Store a scraped job in the database (upsert by sourceUrl).
 */
async function storeScrapedJob(data: ScrapedJobData): Promise<void> {
  const jobData: InsertScrapedJobPosting = {
    title: data.title,
    company: data.company,
    location: data.location,
    experience: data.experience,
    employmentType: data.employmentType,
    description: data.description,
    extractedStack: data.extractedStack,
    postedDate: data.postedDate,
    sourceUrl: data.sourceUrl,
    sourcePlatform: data.sourcePlatform,
  };

  await db
    .insert(scrapedJobPostingsTable)
    .values(jobData)
    .onDuplicateKeyUpdate({
      set: {
        title: jobData.title,
        company: jobData.company,
        location: jobData.location,
        experience: jobData.experience,
        employmentType: jobData.employmentType,
        description: jobData.description,
        extractedStack: jobData.extractedStack,
        postedDate: jobData.postedDate,
        sourcePlatform: jobData.sourcePlatform,
        createdAt: sql`now()`,
      },
    });
}

/**
 * Scrape all configured URLs and store results.
 * Returns a summary of results.
 */
export async function scrapeAllSources(): Promise<{
  total: number;
  success: number;
  failed: number;
  results: { url: string; status: "success" | "failed"; title?: string; stackCount?: number; error?: string }[];
}> {
  const config = loadJobSources();
  const results: {
    url: string;
    status: "success" | "failed";
    title?: string;
    stackCount?: number;
    error?: string;
  }[] = [];

  let success = 0;
  let failed = 0;

  logger.info({ urlCount: config.urls.length }, "Starting job scraping run");

  for (const url of config.urls) {
    try {
      logger.info({ url }, "Scraping job URL");

      // Route Naukri listing URLs to the multi-page scraper
      if (isNaukriListingUrl(url)) {
        const naukriResults = await scrapeNaukriListingPage(url);
        for (const data of naukriResults) {
          await storeScrapedJob(data);
          success++;
          results.push({
            url: data.sourceUrl,
            status: "success",
            title: data.title,
            stackCount: data.extractedStack.length,
          });
        }
        logger.info({ url, jobsFound: naukriResults.length }, "Naukri listing scrape complete");
      } else {
        // Existing flow for generic, lever, greenhouse
        const data = await parseJobUrl(url);

        if (data) {
          await storeScrapedJob(data);
          success++;
          results.push({
            url,
            status: "success",
            title: data.title,
            stackCount: data.extractedStack.length,
          });
          logger.info(
            { url, title: data.title, techs: data.extractedStack.length },
            "Successfully scraped and stored job",
          );
        } else {
          failed++;
          results.push({ url, status: "failed", error: "Parser returned null" });
        }
      }
    } catch (error: any) {
      failed++;
      results.push({ url, status: "failed", error: error.message });
      logger.error({ url, error: error.message }, "Failed to scrape URL");
    }
  }

  logger.info({ total: config.urls.length, success, failed }, "Job scraping run completed");

  return { total: config.urls.length, success, failed, results };
}
