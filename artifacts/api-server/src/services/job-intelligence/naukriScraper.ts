/**
 * Naukri Job Scraper (Multi-Page)
 *
 * Scrapes job listings from Naukri.com using Playwright to handle dynamic JS rendering.
 * Extracts title, company, location, experience, and skill tags directly from job cards.
 * Automatically navigates through multiple pages using pagination.
 */

import { chromium, Page } from "playwright";
import { type ScrapedJobData } from "./parser";
import { extractTechStack } from "./techStackExtractor";
import { logger } from "../../lib/logger";

const MAX_PAGES = 20;

/**
 * Normalizes Naukri listing URLs
 */
export function isNaukriListingUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("naukri.com") && 
           (parsed.pathname.includes("-jobs") || parsed.pathname.includes("/jobs-") || parsed.searchParams.has("k"));
  } catch {
    return false;
  }
}

/**
 * Wait for a random number of milliseconds between min and max
 */
async function randomSleep(minMs = 1500, maxMs = 3500) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extracts job data from a single listing page
 */
async function extractJobsFromPage(page: Page, sourcePlatform: string): Promise<ScrapedJobData[]> {
  const jobs: ScrapedJobData[] = [];
  
  // Wait for the job tuple wrapper to exist (Naukri structure)
  // Fallbacks: .srp-jobtuple-wrapper, .jobTuple, article
  try {
    // Wait for at least one job card to appear
    await page.waitForSelector('.srp-jobtuple-wrapper, .jobTuple, article', { timeout: 10000 });
  } catch (error) {
    logger.warn("Could not find job card container on Naukri page within timeout.");
    return jobs;
  }

  // Get all job cards
  const jobCards = await page.$$('.srp-jobtuple-wrapper, .jobTuple, article');

  for (const card of jobCards) {
    try {
      // Title extraction
      const titleElem = await card.$('a.title, a[class*="title"], [class*="job-title"]');
      const title = titleElem ? (await titleElem.innerText()).trim() : "Unknown Title";
      
      // Attempt to get detail URL for sourceUrl deduplication
      const detailUrlRaw = titleElem ? await titleElem.getAttribute('href') : null;
      let detailUrl = "";
      if (detailUrlRaw) {
        detailUrl = detailUrlRaw.startsWith("http") ? detailUrlRaw : `https://www.naukri.com${detailUrlRaw}`;
      }
      
      // If no detail URL is found, we skip, as we cannot upsert reliably without unique sourceUrl
      if (!detailUrl) {
          continue;
      }

      // Company extraction
      const companyElem = await card.$('a.comp-name, .companyInfo a, [class*="company"]');
      const company = companyElem ? (await companyElem.innerText()).trim() : "Unknown Company";

      // Exclude generic non-job cards
      if (!title || title.toLowerCase().includes("sponsored") || !company) {
        continue;
      }

      // Location extraction
      const locationElem = await card.$('.loc, [class*="location"], .locWdth');
      const location = locationElem ? (await locationElem.innerText()).trim() : null;

      // Experience
      const experienceElem = await card.$('.exp, [class*="experience"], .expwdth');
      const experience = experienceElem ? (await experienceElem.innerText()).trim() : null;
      
      // Skills
      const skillElems = await card.$$('ul.tags-gt li, [class*="tag-list"] li, [class*="dot-tags"] li');
      const skillsArray: string[] = [];
      for (const tag of skillElems) {
        skillsArray.push((await tag.innerText()).trim().replace(/•/g, '').trim());
      }
      
      // Description snippet (optional fallback)
      const descElem = await card.$('.job-desc, [class*="job-desc"]');
      const descSnippet = descElem ? (await descElem.innerText()).trim() : "";
      
      const fullTextToExtract = skillsArray.join(" ") + " " + descSnippet;
      const extractedStack = extractTechStack(fullTextToExtract);

      jobs.push({
        title: title.slice(0, 300),
        company: company.slice(0, 200),
        location: location?.slice(0, 200) || null,
        experience: experience?.slice(0, 100) || null,
        employmentType: null, // Usually not clearly visible on listing page
        description: descSnippet.slice(0, 5000), // Short snippet from listing
        extractedStack,
        postedDate: null, 
        sourceUrl: detailUrl,
        sourcePlatform,
      });

    } catch (err: any) {
      logger.warn({ error: err.message }, "Failed to extract a job card on Naukri");
    }
  }

  return jobs;
}

/**
 * Scrapes a Naukri listing page across multiple pagination results
 */
export async function scrapeNaukriListingPage(startUrl: string): Promise<ScrapedJobData[]> {
  logger.info({ url: startUrl }, "Launching Playwright for Naukri listing page...");
  
  const allJobs: ScrapedJobData[] = [];
  const visitedUrls = new Set<string>();
  
<<<<<<< HEAD
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err: any) {
    const isMissingBrowsers = err.message.includes("Executable doesn't exist") || 
                             err.message.includes("Please run the following command") ||
                             err.message.includes("browserType.launch: Executable doesn't exist");
    
    if (isMissingBrowsers) {
      logger.error("Playwright browsers not installed. Please run 'npx playwright install chromium' on the server.");
      throw new Error("Scraping engine (Playwright) is not initialized. Admin must run 'npx playwright install' on the server.");
    }
    throw err;
  }

=======
  const browser = await chromium.launch({ headless: true });
>>>>>>> c98a46269256181b1544afab5ef0c55ce9188775
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  });
  const page = await context.newPage();

  let currentUrl = startUrl;
<<<<<<< HEAD

=======
>>>>>>> c98a46269256181b1544afab5ef0c55ce9188775
  let pageCount = 0;

  try {
    while (pageCount < MAX_PAGES) {
      pageCount++;
      logger.info({ currentUrl, pageCount }, "Scraping Naukri page");
      
      if (visitedUrls.has(currentUrl)) {
        logger.info("Duplicate page detected, stopping pagination.");
        break;
      }
      visitedUrls.add(currentUrl);

      await page.goto(currentUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      
      // Random wait to simulate human
      await randomSleep(2000, 4000);

      const jobsFromPage = await extractJobsFromPage(page, "naukri");
      allJobs.push(...jobsFromPage);
      
      logger.info({ count: jobsFromPage.length, pageCount }, "Extracted jobs from Naukri page");

      if (jobsFromPage.length === 0) {
        logger.info("No jobs found on this page, might have reached the end or been blocked.");
        break;
      }

      // Check for next page button
      const nextBtn = await page.$('a.next, a[class*="pagination-next"], span.action.next, a:has-text("Next")');
      
      if (!nextBtn) {
        logger.info("No 'Next' button found, ending pagination.");
        break;
      }

      // Sometimes next button is disabled
      const isBtnDisabled = await nextBtn.evaluate(node => 
        node.hasAttribute('disabled') || 
        node.classList.contains('disabled') || 
        node.getAttribute('aria-disabled') === 'true'
      );
      
      if (isBtnDisabled) {
        logger.info("Next button is disabled, ending pagination.");
        break;
      }

      // Extract raw href of Next button or try to click it
      const nextHref = await nextBtn.getAttribute('href');
      if (nextHref) {
        currentUrl = nextHref.startsWith("http") ? nextHref : `https://www.naukri.com${nextHref}`;
      } else {
        // Try clicking if href is not straightforward
        await nextBtn.click();
        await page.waitForLoadState("domcontentloaded");
        currentUrl = page.url();
      }
    }
  } catch (err: any) {
    logger.error({ error: err.message }, "Error during Naukri multi-page scrape");
  } finally {
    await browser.close();
  }

  logger.info({ totalJobs: allJobs.length, pagesScraped: pageCount }, "Completed Naukri multi-page scraping");
  return allJobs;
}
