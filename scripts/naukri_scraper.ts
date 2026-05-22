/**
 * naukri_scraper.ts — Standalone Naukri Listing Page Scraper
 *
 * Scrapes ALL job listings from a Naukri.com search/listing page,
 * paginating through every result page and storing each job in
 * the scraped_job_postings database table.
 *
 * Usage (run from the scripts/ directory):
 *   node --env-file=../.env --import tsx naukri_scraper.ts <naukri-listing-url>
 *
 * Example:
 *   node --env-file=../.env --import tsx naukri_scraper.ts \
 *     "https://www.naukri.com/computer-science-freshers-jobs-in-vadodara"
 *
 * Requirements:
 *   - DATABASE_URL in ../.env
 *   - Playwright Chromium: npx playwright install chromium
 *   - pnpm install (at workspace root) to install this script's dependencies
 *
 * Pagination note:
 *   Naukri uses URL-based pagination: appends -2, -3 … to the base URL.
 *   e.g. /computer-science-freshers-jobs-in-vadodara-2  (page 2)
 *        /computer-science-freshers-jobs-in-vadodara-3  (page 3)
 */

import { chromium, type Page, type BrowserContext } from "playwright";
import mysql from "mysql2/promise";
import pino from "pino";

// Pure-TS file with no external deps — tsx resolves this relative import directly.
import { extractTechStack } from "../artifacts/api-server/src/services/job-intelligence/techStackExtractor.js";

// ─── Logger (same config as api-server/src/lib/logger.ts) ───────────────────

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(process.env.NODE_ENV !== "production"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }
    : {}),
});

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_PAGES = 20;          // safety cap — Naukri rarely has more
const SOURCE_PLATFORM = "naukri";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScrapedJob {
  title: string;
  company: string;
  location: string | null;
  experience: string | null;
  description: string;
  extractedStack: string[];
  sourceUrl: string;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function randomSleep(minMs = 2000, maxMs = 4500): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Builds the URL for a given page number.
 * Naukri appends the page number to the path: base-url-2, base-url-3, …
 * Page 1 is the original URL with no suffix.
 */
function buildPageUrl(baseUrl: string, page: number): string {
  if (page === 1) return baseUrl;
  // Strip trailing slash then append -N
  return baseUrl.replace(/\/$/, "") + `-${page}`;
}

// ─── Extraction ──────────────────────────────────────────────────────────────

/**
 * Extracts all job cards from the current Playwright page.
 *
 * Naukri SRP HTML structure (verified 2024-2025):
 *
 *   <div class="srp-jobtuple-wrapper">
 *     <div class="row1"> <a class="title">Title</a> </div>
 *     <div class="row2"> <a class="comp-name">Company</a> </div>
 *     <div class="row3">
 *       <span class="exp-wrap">  <span class="expwdth">2-5 Yrs</span> </span>
 *       <span class="loc-wrap">  <span class="locWdth">City</span>    </span>
 *     </div>
 *     <div class="row4"> <span>Job description snippet</span> </div>
 *     <div class="row5/6"> <ul class="tags-gt"> <li class="dot-gt tag-li">Skill</li> </ul> </div>
 *   </div>
 */
async function extractJobsFromPage(page: Page): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];

  // Wait until at least one job card is rendered
  try {
    await page.waitForSelector(".srp-jobtuple-wrapper", { timeout: 20000 });
  } catch {
    logger.warn("No .srp-jobtuple-wrapper cards found within timeout — page may be empty or blocked.");
    return jobs;
  }

  const cards = await page.$$(".srp-jobtuple-wrapper");
  logger.info({ cardCount: cards.length }, "Job cards detected on page");

  for (const card of cards) {
    try {
      // ── Title + source URL (unique key for deduplication) ──────────────
      const titleElem = await card.$("a.title");
      if (!titleElem) continue;

      const title = (await titleElem.innerText()).trim();
      if (!title || title.toLowerCase().includes("sponsored")) continue;

      const hrefRaw = await titleElem.getAttribute("href");
      if (!hrefRaw) continue;
      const sourceUrl = hrefRaw.startsWith("http")
        ? hrefRaw
        : `https://www.naukri.com${hrefRaw}`;

      // ── Company ────────────────────────────────────────────────────────
      const companyElem = await card.$("a.comp-name");
      const company = companyElem ? (await companyElem.innerText()).trim() : "";
      if (!company) continue;

      // ── Experience ─────────────────────────────────────────────────────
      // Primary: the inner readable span inside exp-wrap
      // Fallback: any text in the exp-wrap container itself
      const expElem =
        (await card.$(".expwdth")) ??
        (await card.$(".exp-wrap span")) ??
        (await card.$(".exp-wrap"));
      const experience = expElem ? (await expElem.innerText()).trim() || null : null;

      // ── Location ───────────────────────────────────────────────────────
      const locElem =
        (await card.$(".locWdth")) ??
        (await card.$(".loc-wrap span")) ??
        (await card.$(".loc-wrap"));
      const location = locElem ? (await locElem.innerText()).trim() || null : null;

      // ── Skill tags ─────────────────────────────────────────────────────
      // Naukri skill tags are in <li class="dot-gt tag-li"> within ul.tags-gt
      const skillElems = await card.$$("li.dot-gt, ul.tags-gt li");
      const skillsText = (
        await Promise.all(skillElems.map(el => el.innerText()))
      )
        .map(t => t.trim().replace(/[•·]/g, "").trim())
        .filter(Boolean)
        .join(" ");

      // ── Description snippet ────────────────────────────────────────────
      // row4 typically has a short description or minimum requirements
      const descElem =
        (await card.$(".job-desc")) ??
        (await card.$(".jd-desc")) ??
        (await card.$(".row4 span"));
      const descSnippet = descElem ? (await descElem.innerText()).trim() : "";

      // ── Tech stack extraction ──────────────────────────────────────────
      // Feed both skill tags and description snippet into the extractor
      const extractedStack = extractTechStack(`${skillsText} ${descSnippet}`);

      jobs.push({
        title: title.slice(0, 300),
        company: company.slice(0, 200),
        location: location?.slice(0, 200) ?? null,
        experience: experience?.slice(0, 100) ?? null,
        description: descSnippet.slice(0, 5000),
        extractedStack,
        sourceUrl,
      });
    } catch (err: any) {
      logger.warn({ error: err.message }, "Failed to extract a job card — skipping");
    }
  }

  return jobs;
}

// ─── "No more results" detection ─────────────────────────────────────────────

/**
 * Returns true if the page signals that no jobs exist (end of results or
 * redirected back to page 1 with a different URL than requested).
 */
async function isEmptyResultsPage(page: Page, requestedUrl: string): Promise<boolean> {
  const currentUrl = page.url();

  // Naukri may redirect out-of-range pages back to page 1
  if (currentUrl !== requestedUrl && !currentUrl.includes(requestedUrl.replace(/\/$/, ""))) {
    logger.info({ requestedUrl, currentUrl }, "Redirected away from requested page — likely past last page.");
    return true;
  }

  // Check for explicit "no results" message
  const noResultsText = await page.$("[class*='no-result'], [class*='noResult'], [class*='zero-result']");
  if (noResultsText) return true;

  return false;
}

// ─── Database ─────────────────────────────────────────────────────────────────

async function storeJob(pool: mysql.Pool, job: ScrapedJob): Promise<void> {
  await pool.execute(
    `INSERT INTO scraped_job_postings
       (title, company, location, experience, employment_type,
        description, extracted_stack, posted_date, source_url, source_platform)
     VALUES (?, ?, ?, ?, NULL, ?, ?, NULL, ?, ?)
     ON DUPLICATE KEY UPDATE
       title            = VALUES(title),
       company          = VALUES(company),
       location         = VALUES(location),
       experience       = VALUES(experience),
       description      = VALUES(description),
       extracted_stack  = VALUES(extracted_stack),
       source_platform  = VALUES(source_platform),
       created_at       = NOW()`,
    [
      job.title,
      job.company,
      job.location,
      job.experience,
      job.description,
      JSON.stringify(job.extractedStack),
      job.sourceUrl,
      SOURCE_PLATFORM,
    ],
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startUrl = process.argv[2];

  if (!startUrl || !startUrl.includes("naukri.com")) {
    console.error(
      "Usage:\n" +
      "  node --env-file=../.env --import tsx naukri_scraper.ts <naukri-listing-url>\n\n" +
      "Example:\n" +
      '  node --env-file=../.env --import tsx naukri_scraper.ts "https://www.naukri.com/computer-science-freshers-jobs-in-vadodara"',
    );
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to ../.env");
    process.exit(1);
  }

  // Normalise: strip any page suffix from input so we always start at page 1.
  // e.g. if user accidentally passes the "-2" URL we strip it.
  const baseUrl = startUrl.replace(/-\d+$/, "");

  logger.info({ url: baseUrl, urlCount: 1 }, "Starting job scraping run");

  // ── DB setup ───────────────────────────────────────────────────────────────
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });

  // ── Browser setup ──────────────────────────────────────────────────────────
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
      ],
    });
  } catch (err: any) {
    if (
      err.message.includes("Executable doesn't exist") ||
      err.message.includes("Please run the following command")
    ) {
      logger.error("Playwright Chromium not installed. Run: npx playwright install chromium");
    } else {
      logger.error({ error: err.message }, "Failed to launch browser");
    }
    await pool.end();
    process.exit(1);
  }

  const context: BrowserContext = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 768 },
    locale: "en-IN",
    extraHTTPHeaders: {
      "Accept-Language": "en-IN,en;q=0.9",
    },
  });

  // Mask Playwright's navigator.webdriver flag (basic anti-bot evasion)
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  const page = await context.newPage();

  let totalSuccess = 0;
  let totalFailed = 0;
  let pageNum = 1;

  try {
    while (pageNum <= MAX_PAGES) {
      const pageUrl = buildPageUrl(baseUrl, pageNum);
      logger.info({ currentUrl: pageUrl, pageCount: pageNum }, "Scraping Naukri page");

      try {
        await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      } catch (err: any) {
        logger.error({ error: err.message, url: pageUrl }, "Failed to navigate to page");
        break;
      }

      // Human-like delay after page load
      await randomSleep();

      // Detect end of results
      if (await isEmptyResultsPage(page, pageUrl)) {
        logger.info({ pageNum }, "No more results — pagination complete.");
        break;
      }

      const jobs = await extractJobsFromPage(page);
      logger.info({ count: jobs.length, pageCount: pageNum }, "Extracted jobs from Naukri page");

      if (jobs.length === 0) {
        logger.info("Zero jobs extracted from page — stopping pagination.");
        break;
      }

      // Persist each job
      for (const job of jobs) {
        try {
          await storeJob(pool, job);
          totalSuccess++;
          logger.info(
            { url: job.sourceUrl, title: job.title, techs: job.extractedStack.length },
            "Successfully scraped and stored job",
          );
        } catch (err: any) {
          totalFailed++;
          logger.error({ url: job.sourceUrl, error: err.message }, "Failed to store job");
        }
      }

      pageNum++;
    }
  } finally {
    await browser.close();
    await pool.end();
  }

  logger.info(
    {
      total: totalSuccess + totalFailed,
      success: totalSuccess,
      failed: totalFailed,
    },
    "Job scraping run completed",
  );
}

main().catch(err => {
  logger.error({ error: err.message }, "Fatal error in naukri_scraper");
  process.exit(1);
});
