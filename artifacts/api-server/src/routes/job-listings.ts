import { Router, type IRouter } from "express";
import { eq, and, ilike, inArray, gte, desc } from "drizzle-orm";
import { db, usersTable, jobListingsTable, userSavedJobsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod";

const router: IRouter = Router();

const ListJobListingsQuery = z.object({
  domain: z.string().optional(),
  location: z.string().optional(),
  skills: z.string().optional(), // comma separated
  daysOld: z.string().transform(v => parseInt(v)).optional(),
  page: z.string().transform(v => parseInt(v) || 1).optional(),
  limit: z.string().transform(v => parseInt(v) || 10).optional(),
});

async function getUserId(clerkId: string): Promise<number | null> {
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user?.id ?? null;
}

// ─── S6.5 & S6.8: List with Filters ──────────────────────────────────────────

router.get("/job-listings", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListJobListingsQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { domain, location, skills, daysOld, page = 1, limit = 10 } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (domain) conditions.push(eq(jobListingsTable.domain, domain));
  if (location) conditions.push(ilike(jobListingsTable.location, `%${location}%`));
  if (daysOld) {
    const date = new Date();
    date.setDate(date.getDate() - daysOld);
    conditions.push(gte(jobListingsTable.postedAt, date));
  }
  
  // Note: Drizzle pg doesn't have a direct "array contains" that works with variables easily in all versions
  // but we can use sql or filters if needed. For now, we'll fetch and filter if skills are provided, 
  // or use sql for performance if we had a lot of rows.

  let query = db.select().from(jobListingsTable).where(and(...conditions)).orderBy(desc(jobListingsTable.postedAt)).limit(limit).offset(offset);
  const results = await query;
  
  // Post-filter for skills if provided
  let filtered = results;
  if (skills) {
    const skillList = skills.toLowerCase().split(",").map(s => s.trim());
    filtered = results.filter(j => 
      skillList.every(s => j.requiredSkills.map(rs => rs.toLowerCase()).includes(s))
    );
  }

  res.json({
    jobs: filtered,
    page,
    limit
  });
});

// ─── S6.7: Detail View ───────────────────────────────────────────────────────

router.get("/job-listings/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [job] = await db.select().from(jobListingsTable).where(eq(jobListingsTable.id, id));
  
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  // Check if saved
  const userId = await getUserId((req as any).clerkUserId);
  let isSaved = false;
  if (userId) {
    const [saved] = await db.select().from(userSavedJobsTable).where(and(eq(userSavedJobsTable.userId, userId), eq(userSavedJobsTable.jobId, id)));
    isSaved = !!saved;
  }

  res.json({ ...job, isSaved });
});

// ─── S6.7: Save Job ──────────────────────────────────────────────────────────

router.post("/job-listings/:id/save", requireAuth, async (req, res): Promise<void> => {
  const jobId = parseInt(req.params.id);
  const userId = await getUserId((req as any).clerkUserId);
  
  if (!userId) {
    res.status(500).json({ error: "User not found" });
    return;
  }

  const [existing] = await db.select().from(userSavedJobsTable).where(and(eq(userSavedJobsTable.userId, userId), eq(userSavedJobsTable.jobId, jobId)));

  if (existing) {
    await db.delete(userSavedJobsTable).where(eq(userSavedJobsTable.id, existing.id));
    res.json({ saved: false });
  } else {
    await db.insert(userSavedJobsTable).values({ userId, jobId });
    res.json({ saved: true });
  }
});

router.get("/job-listings/saved", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json([]);
    return;
  }

  const saved = await db.select({
    job: jobListingsTable
  }).from(userSavedJobsTable)
    .innerJoin(jobListingsTable, eq(userSavedJobsTable.jobId, jobListingsTable.id))
    .where(eq(userSavedJobsTable.userId, userId));

  res.json(saved.map(s => s.job));
});

export default router;
