/**
 * Job Intelligence API Routes
 *
 * Routes for scraping, managing sources, and accessing trend analytics.
 */

import { Router, type IRouter } from "express";
import { requireAuth, requireAdmin } from "../middlewares/requireAuth";
import { scrapeAllSources, addJobSource, loadJobSources } from "../services/job-intelligence/scraper";
import { analyzeTrends, getTop3Stacks } from "../services/job-intelligence/trendAnalyzer";
import { db, scrapedJobPostingsTable } from "../lib/db/index.js";
import { desc } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// ─── GET /jobs/scrape — Trigger scraping of all configured URLs ─────────────
// Admin-only to prevent abuse

router.get("/jobs/scrape", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const result = await scrapeAllSources();

    // After scraping, automatically run trend analysis
    const trends = await analyzeTrends();

    res.json({
      scrape: result,
      trends: {
        top_technologies: trends.top_technologies,
        top_stack_combinations: trends.top_stack_combinations,
        total_jobs_analyzed: trends.total_jobs_analyzed,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: `Scraping failed: ${error.message}` });
  }
});

// ─── POST /jobs/add-source — Add a new URL to job_sources.json ──────────────

const AddSourceBody = z.object({
  url: z.string().url("Must be a valid URL"),
});

router.post("/jobs/add-source", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AddSourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = addJobSource(parsed.data.url);
  if (result.success) {
    res.status(201).json(result);
  } else {
    res.status(400).json(result);
  }
});

// ─── GET /jobs/trending-stacks — Full trending data ─────────────────────────

router.get("/jobs/trending-stacks", requireAuth, async (_req, res): Promise<void> => {
  try {
    const trends = await analyzeTrends();
    res.json(trends);
  } catch (error: any) {
    res.status(500).json({ error: `Trend analysis failed: ${error.message}` });
  }
});

// ─── GET /jobs/top-3-stacks — Just the top 3 for dashboard card ─────────────

router.get("/jobs/top-3-stacks", requireAuth, async (_req, res): Promise<void> => {
  try {
    const trends = await getTop3Stacks();
    res.json({
      top_technologies: trends.top_technologies,
      top_stack_combinations: trends.top_stack_combinations,
      total_jobs_analyzed: trends.total_jobs_analyzed,
      analyzed_at: trends.analyzed_at,
    });
  } catch (error: any) {
    res.status(500).json({ error: `Failed to get top stacks: ${error.message}` });
  }
});

// ─── GET /jobs/scraped — List all scraped job postings ──────────────────────

router.get("/jobs/scraped", requireAuth, async (req, res): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const jobs = await db
      .select()
      .from(scrapedJobPostingsTable)
      .orderBy(desc(scrapedJobPostingsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ jobs, limit, offset });
  } catch (error: any) {
    res.status(500).json({ error: `Failed to list scraped jobs: ${error.message}` });
  }
});

// ─── GET /jobs/sources — List configured source URLs ────────────────────────
// Admin-only as this is part of source management

router.get("/jobs/sources", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const config = loadJobSources();
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: `Failed to load sources: ${error.message}` });
  }
});

export default router;
