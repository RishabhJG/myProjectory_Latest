/**
 * Naukri Listing Scraper — API-Server Service
 *
 * Scrapes all job cards from a Naukri.com search/listing page using
 * Playwright, paginates via URL-based page numbers, stores every job
 * in scraped_job_postings, and returns a scrape-run summary.
 *
 * Exported by job-intelligence.ts route for the admin UI endpoint
 * POST /jobs/scrape-naukri.
 *
 * Naukri SRP HTML structure (verified 2024-2025):
 *
 *   <div class="srp-jobtuple-wrapper">
 *     <div class="row1"> <a class="title">Title</a> </div>
 *     <div class="row2"> <a class="comp-name">Company</a> </div>
 *     <div class="row3">
 *       <span class="exp-wrap"> <span class="expwdth">2-5 Yrs</span> </span>
 *       <span class="loc-wrap"> <span class="locWdth">City</span>    </span>
 *     </div>
 *     <div class="row4"> <span>description snippet</span> </div>
 *     <div class="row5/6"> <ul class="tags-gt"> <li class="dot-gt tag-li">Skill</li> </ul> </div>
 *   </div>
 *
 * Pagination: Naukri appends -2, -3 … to the base path for subsequent pages.
 */

import { chromium, type Page, type BrowserContext } from "playwright";
import { type ScrapedJobData } from "./parser";
import { extractTechStack } from "./techStackExtractor";
import { logger } from "../../lib/logger";
import { db, scrapedJobPostingsTable, type InsertScrapedJobPosting } from "../../lib/db/index.js";
import { sql } from "drizzle-orm";

const MAX_PAGES = 20;
const SOURCE_PLATFORM = "naukri";

// ─── Return type (matches scrapeAllSources shape) ────────────────────────────

export interface NaukriScrapeResult {
  total: number;
  success: number;
  failed: number;
  results: {
    url: string;
    status: "success" | "failed";
    title?: string;
    stackCount?: number;
    error?: string;
  }[];
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function randomSleep(minMs = 2000, maxMs = 4500): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Builds the URL for a given page number.
 * Naukri appends -N to the path for pages 2+.
 * e.g. /computer-science-freshers-jobs-in-vadodara-2
 */
function buildPageUrl(baseUrl: string, page: number): string {
  if (page === 1) return baseUrl;
  return baseUrl.replace(/\/$/, "") + `-${page}`;
}

// ─── Page extraction ─────────────────────────────────────────────────────────

async function extractJobsFromPage(page: Page): Promise<ScrapedJobData[]> {
  const jobs: ScrapedJobData[] = [];

  try {
    // Try to wait for network to be idle first (more reliable)
    await Promise.race([
      page.waitForLoadState("networkidle"),
      new Promise(resolve => setTimeout(resolve, 15000)),
    ]).catch(() => {
      // If network idle times out, continue anyway
    });

    // Try primary selector
    let cardsExist = await page.$(".srp-jobtuple-wrapper");
    
    // Try fallback selectors if primary doesn't exist
    if (!cardsExist) {
      cardsExist = await page.$("[class*='jobTuple']");
    }
    if (!cardsExist) {
      cardsExist = await page.$("[class*='jobCard']");
    }

    if (!cardsExist) {
      logger.warn(
        { pageUrl: page.url() },
        "No job card selectors found. Naukri may be blocking bot access or page structure changed."
      );
      return jobs;
    }

    await page.waitForSelector(".srp-jobtuple-wrapper, [class*='jobTuple'], [class*='jobCard']", {
      timeout: 15000,
    });
  } catch (err: any) {
    logger.warn(
      { error: err.message, pageUrl: page.url() },
      "No job cards found within timeout — page may be empty, blocked, or structure changed."
    );
    return jobs;
  }

  const cards = await page.$$(".srp-jobtuple-wrapper, [class*='jobTuple'], [class*='jobCard']");
  logger.info({ cardCount: cards.length }, "Job cards detected on Naukri page");

  for (const card of cards) {
    try {
      // Title + source URL (used as the unique deduplication key)
      const titleElem = await card.$("a.title");
      if (!titleElem) continue;

      const title = (await titleElem.innerText()).trim();
      if (!title || title.toLowerCase().includes("sponsored")) continue;

      const hrefRaw = await titleElem.getAttribute("href");
      if (!hrefRaw) continue;
      const sourceUrl = hrefRaw.startsWith("http")
        ? hrefRaw
        : `https://www.naukri.com${hrefRaw}`;

      // Company
      const companyElem = await card.$("a.comp-name");
      const company = companyElem ? (await companyElem.innerText()).trim() : "";
      if (!company) continue;

      // Experience — try specific inner span first, then the wrapper
      const expElem =
        (await card.$(".expwdth")) ??
        (await card.$(".exp-wrap span")) ??
        (await card.$(".exp-wrap"));
      const experience = expElem ? (await expElem.innerText()).trim() || null : null;

      // Location
      const locElem =
        (await card.$(".locWdth")) ??
        (await card.$(".loc-wrap span")) ??
        (await card.$(".loc-wrap"));
      const location = locElem ? (await locElem.innerText()).trim() || null : null;

      // Skill tags (li.dot-gt inside ul.tags-gt)
      const skillElems = await card.$$("li.dot-gt, ul.tags-gt li");
      const skillsText = (
        await Promise.all(skillElems.map(el => el.innerText()))
      )
        .map(t => t.trim().replace(/[•·]/g, "").trim())
        .filter(Boolean)
        .join(" ");

      // Short description snippet from the card
      const descElem =
        (await card.$(".job-desc")) ??
        (await card.$(".jd-desc")) ??
        (await card.$(".row4 span"));
      const descSnippet = descElem ? (await descElem.innerText()).trim() : "";

      const extractedStack = extractTechStack(`${skillsText} ${descSnippet}`);

      jobs.push({
        title: title.slice(0, 300),
        company: company.slice(0, 200),
        location: location?.slice(0, 200) ?? null,
        experience: experience?.slice(0, 100) ?? null,
        employmentType: null,
        description: descSnippet.slice(0, 4096),
        extractedStack,
        postedDate: null,
        sourceUrl,
        sourcePlatform: SOURCE_PLATFORM,
      });
    } catch (err: any) {
      logger.warn({ error: err.message }, "Failed to extract a Naukri job card — skipping");
    }
  }

  return jobs;
}

// ─── Database store ──────────────────────────────────────────────────────────

async function storeJob(data: ScrapedJobData): Promise<void> {
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
        description: jobData.description,
        extractedStack: jobData.extractedStack,
        sourcePlatform: jobData.sourcePlatform,
        createdAt: sql`now()`,
      },
    });
}

// ─── Empty-results detection ─────────────────────────────────────────────────

async function isEmptyResultsPage(page: Page, requestedUrl: string): Promise<boolean> {
  const currentUrl = page.url();
  // Naukri redirects out-of-range page numbers back to page 1
  if (
    currentUrl !== requestedUrl &&
    !currentUrl.startsWith(requestedUrl.replace(/\/$/, ""))
  ) {
    logger.info({ requestedUrl, currentUrl }, "Redirected away from requested page — past last page.");
    return true;
  }

  const noResults = await page.$("[class*='no-result'], [class*='noResult'], [class*='zero-result']");
  return !!noResults;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function scrapeNaukriListingPage(startUrl: string): Promise<NaukriScrapeResult> {
  // Strip any accidental page suffix so we always start from page 1
  const baseUrl = startUrl.replace(/-\d+$/, "");

  logger.info({ url: baseUrl }, "Launching Playwright for Naukri listing page");

  const results: NaukriScrapeResult["results"] = [];
  let success = 0;
  let failed = 0;

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled", "--disable-infobars"],
    });
  } catch (err: any) {
    const missing =
      err.message.includes("Executable doesn't exist") ||
      err.message.includes("Please run the following command");
    if (missing) {
      logger.error("Playwright Chromium not installed. Run: npx playwright install chromium");
      throw new Error("Scraping engine not initialized. Run 'npx playwright install chromium' on the server.");
    }
    throw err;
  }

  const context: BrowserContext = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 768 },
    locale: "en-IN",
    extraHTTPHeaders: {
      "Accept-Language": "en-IN,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
    },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["en-IN", "en"] });
  });

  const page = await context.newPage();
  
  // Add request listener to see if Naukri is blocking us
  page.on("response", (response) => {
    if (response.status() === 403 || response.status() === 429) {
      logger.warn(
        { status: response.status(), url: response.url() },
        "Received blocking response from Naukri"
      );
    }
  });

  let pageNum = 1;

  try {
    while (pageNum <= MAX_PAGES) {
      const pageUrl = buildPageUrl(baseUrl, pageNum);
      logger.info({ currentUrl: pageUrl, pageCount: pageNum }, "Scraping Naukri page");

      try {
        await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
        // Wait for network to be more idle after page load
        await Promise.race([
          page.waitForLoadState("networkidle"),
          new Promise(resolve => setTimeout(resolve, 10000)),
        ]).catch(() => {
          // Continue even if network idle times out
        });
      } catch (err: any) {
        logger.error({ error: err.message, url: pageUrl }, "Navigation failed");
        break;
      }

      await randomSleep();

      if (await isEmptyResultsPage(page, pageUrl)) {
        logger.info({ pageNum }, "No more results — pagination complete.");
        break;
      }

      const jobs = await extractJobsFromPage(page);
      logger.info({ count: jobs.length, pageCount: pageNum }, "Extracted jobs from Naukri page");

      if (jobs.length === 0) {
        logger.info("No jobs extracted — stopping pagination.");
        break;
      }

      for (const job of jobs) {
        try {
          await storeJob(job);
          success++;
          results.push({
            url: job.sourceUrl,
            status: "success",
            title: job.title,
            stackCount: job.extractedStack.length,
          });
          logger.info(
            { url: job.sourceUrl, title: job.title, techs: job.extractedStack.length },
            "Successfully scraped and stored job",
          );
        } catch (err: any) {
          failed++;
          results.push({ url: job.sourceUrl, status: "failed", error: err.message });
          logger.error({ url: job.sourceUrl, error: err.message }, "Failed to store job");
        }
      }

      pageNum++;
    }
  } finally {
    await browser.close();
  }

  const total = success + failed;
  logger.info({ total, success, failed }, "Naukri scraping run completed");

  return { total, success, failed, results };
}
