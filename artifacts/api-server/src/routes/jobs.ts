import { Router, type IRouter } from "express";
import { eq, and, ilike } from "drizzle-orm";
import { db, usersTable, projectsTable, jobsTable } from "@workspace/db";
import {
  ListJobsQueryParams,
  ListJobsResponse,
  GetJobMatchesResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function getUserId(clerkId: string): Promise<number | null> {
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user?.id ?? null;
}

router.get("/jobs", requireAuth, async (req, res): Promise<void> => {
  const params = ListJobsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let query = db.select().from(jobsTable);
  const allJobs = await query;

  let filtered = allJobs;
  if (params.data.tech) {
    const techLower = params.data.tech.toLowerCase();
    filtered = allJobs.filter(j =>
      j.requiredSkills.some(s => s.toLowerCase().includes(techLower))
    );
  }

  const limit = params.data.limit || 20;
  const result = filtered.slice(0, limit);

  res.json(ListJobsResponse.parse(result));
});

router.get("/jobs/matches", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json([]);
    return;
  }

  const projects = await db.select().from(projectsTable).where(and(eq(projectsTable.userId, userId), eq(projectsTable.completionStatus, "completed")));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, (req as any).clerkUserId));

  const userSkills = new Set([
    ...projects.flatMap(p => p.technologies),
    ...(user?.skills || []),
  ]);

  const allJobs = await db.select().from(jobsTable);

  const matches = allJobs.map(job => {
    const matchingSkills = job.requiredSkills.filter(s =>
      [...userSkills].some(us => us.toLowerCase() === s.toLowerCase())
    );
    const missingSkills = job.requiredSkills.filter(s =>
      ![...userSkills].some(us => us.toLowerCase() === s.toLowerCase())
    );
    const matchScore = job.requiredSkills.length > 0
      ? Math.round((matchingSkills.length / job.requiredSkills.length) * 100)
      : 0;

    return {
      job,
      matchScore,
      matchingSkills,
      missingSkills,
    };
  }).filter(m => m.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 20);

  res.json(GetJobMatchesResponse.parse(matches));
});

export default router;
