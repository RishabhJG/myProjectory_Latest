/**
 * Job Posting Parser
 *
 * Platform-specific parsers for Greenhouse, Lever, and generic HTML pages.
 * Each parser returns a common ScrapedJobData interface.
 */

import axios from "axios";
import * as cheerio from "cheerio";
import { extractTechStack } from "./techStackExtractor";
import { logger } from "../../lib/logger";

// ─── Common Output Interface ────────────────────────────────────────────────

export interface ScrapedJobData {
  title: string;
  company: string;
  location: string | null;
  experience: string | null;
  employmentType: string | null;
  description: string;
  extractedStack: string[];
  postedDate: Date | null;
  sourceUrl: string;
  sourcePlatform: string;
}

// ─── Platform Detection ─────────────────────────────────────────────────────

export function detectPlatform(url: string): "greenhouse" | "lever" | "generic" {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("greenhouse.io") || lowerUrl.includes("boards.greenhouse")) {
    return "greenhouse";
  }
  if (lowerUrl.includes("lever.co") || lowerUrl.includes("jobs.lever")) {
    return "lever";
  }
  return "generic";
}

// ─── Greenhouse Parser ──────────────────────────────────────────────────────

/**
 * Greenhouse exposes job data at a public JSON endpoint.
 * URL pattern: https://boards.greenhouse.io/{company}/jobs/{id}
 * JSON API:    https://boards-api.greenhouse.io/v1/boards/{company}/jobs/{id}
 */
export async function parseGreenhouseJob(url: string): Promise<ScrapedJobData | null> {
  try {
    // Extract company and job ID from URL
    const match = url.match(/greenhouse\.io\/(\w+)\/jobs\/(\d+)/i)
      ?? url.match(/boards-api\.greenhouse\.io\/v1\/boards\/(\w+)\/jobs\/(\d+)/i);

    if (!match) {
      logger.warn({ url }, "Could not parse Greenhouse URL pattern");
      return null;
    }

    const [, company, jobId] = match;
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}`;

    const response = await axios.get(apiUrl, { timeout: 15000 });
    const data = response.data;

    // Strip HTML from content
    const $ = cheerio.load(data.content || "");
    const descriptionText = $.text();

    const location = data.location?.name || null;
    const extractedStack = extractTechStack(descriptionText);

    return {
      title: data.title || "Unknown Title",
      company: data.company?.name || company,
      location,
      experience: null, // Greenhouse doesn't expose this in structured form
      employmentType: null,
      description: descriptionText.slice(0, 5000),
      extractedStack,
      postedDate: data.updated_at ? new Date(data.updated_at) : null,
      sourceUrl: url,
      sourcePlatform: "greenhouse",
    };
  } catch (error: any) {
    logger.error({ url, error: error.message }, "Failed to parse Greenhouse job");
    return null;
  }
}

// ─── Lever Parser ───────────────────────────────────────────────────────────

/**
 * Lever exposes job data at a public JSON endpoint.
 * URL pattern: https://jobs.lever.co/{company}/{id}
 * JSON API:    https://api.lever.co/v0/postings/{company}/{id}
 */
export async function parseLeverJob(url: string): Promise<ScrapedJobData | null> {
  try {
    // Extract company and job ID from URL
    const match = url.match(/lever\.co\/([^/]+)\/([a-f0-9-]+)/i);

    if (!match) {
      logger.warn({ url }, "Could not parse Lever URL pattern");
      return null;
    }

    const [, company, jobId] = match;
    const apiUrl = `https://api.lever.co/v0/postings/${company}/${jobId}`;

    const response = await axios.get(apiUrl, { timeout: 15000 });
    const data = response.data;

    // Extract full text from Lever's list sections
    let descParts: string[] = [];
    if (data.descriptionPlain) {
      descParts.push(data.descriptionPlain);
    }
    if (Array.isArray(data.lists)) {
      for (const list of data.lists) {
        if (list.text) descParts.push(list.text);
        if (list.content) {
          const $ = cheerio.load(list.content);
          descParts.push($.text());
        }
      }
    }
    if (data.additionalPlain) {
      descParts.push(data.additionalPlain);
    }

    const description = descParts.join("\n").slice(0, 5000);
    const extractedStack = extractTechStack(description);

    // Lever categories for work type, location, team
    const categories = data.categories || {};

    return {
      title: data.text || "Unknown Title",
      company: company.charAt(0).toUpperCase() + company.slice(1),
      location: categories.location || data.workplaceType || null,
      experience: categories.experience || null,
      employmentType: categories.commitment || categories.team || null,
      description,
      extractedStack,
      postedDate: data.createdAt ? new Date(data.createdAt) : null,
      sourceUrl: url,
      sourcePlatform: "lever",
    };
  } catch (error: any) {
    logger.error({ url, error: error.message }, "Failed to parse Lever job");
    return null;
  }
}

// ─── Generic HTML Parser ────────────────────────────────────────────────────

/**
 * Fallback parser for any career page. Attempts to find job-related
 * content via common HTML patterns and meta tags.
 */
export async function parseGenericJob(url: string): Promise<ScrapedJobData | null> {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    const $ = cheerio.load(response.data);

    // Try to extract title
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('h1[class*="title"], h1[class*="job"], h1[class*="position"]').first().text().trim() ||
      $("h1").first().text().trim() ||
      $("title").text().trim() ||
      "Unknown Title";

    // Try to extract company
    const company =
      $('meta[property="og:site_name"]').attr("content") ||
      $('[class*="company"], [class*="org"]').first().text().trim() ||
      new URL(url).hostname.replace("www.", "").split(".")[0] ||
      "Unknown Company";

    // Try to extract description from common selectors
    const descSelectors = [
      '[class*="description"]',
      '[class*="job-detail"]',
      '[class*="job-content"]',
      '[class*="posting-detail"]',
      '[id*="description"]',
      "article",
      "main",
    ];

    let description = "";
    for (const selector of descSelectors) {
      const text = $(selector).first().text().trim();
      if (text && text.length > 100) {
        description = text;
        break;
      }
    }

    if (!description) {
      description = $("body").text().trim();
    }

    description = description.replace(/\s+/g, " ").slice(0, 5000);

    // Extract location
    const location =
      $('[class*="location"], [class*="locale"]').first().text().trim() || null;

    // Extract employment type
    const employmentType =
      $('[class*="type"], [class*="employment"]').first().text().trim() || null;

    const extractedStack = extractTechStack(description);

    return {
      title: title.slice(0, 300),
      company: company.slice(0, 200),
      location: location?.slice(0, 200) || null,
      experience: null,
      employmentType: employmentType?.slice(0, 100) || null,
      description,
      extractedStack,
      postedDate: null,
      sourceUrl: url,
      sourcePlatform: "generic",
    };
  } catch (error: any) {
    logger.error({ url, error: error.message }, "Failed to parse generic job page");
    return null;
  }
}

/**
 * Parse a job URL by auto-detecting the platform.
 */
export async function parseJobUrl(url: string): Promise<ScrapedJobData | null> {
  const platform = detectPlatform(url);

  switch (platform) {
    case "greenhouse":
      return parseGreenhouseJob(url);
    case "lever":
      return parseLeverJob(url);
    case "generic":
      return parseGenericJob(url);
    default:
      return parseGenericJob(url);
  }
}
