import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, projectsTable, roadmapsTable, milestonesTable, tasksTable, jobsTable, activityTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetSkillGapsResponse,
  GetRecentActivityResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function getUserId(clerkId: string): Promise<number | null> {
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user?.id ?? null;
}

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  const profileComplete = userId !== null;

  if (!userId) {
    res.json(GetDashboardSummaryResponse.parse({
      totalProjects: 0,
      completedProjects: 0,
      strongestTech: null,
      readinessScore: 0,
      roadmapProgress: 0,
      totalJobMatches: 0,
      profileComplete: false,
    }));
    return;
  }

  const projects = await db.select().from(projectsTable).where(eq(projectsTable.userId, userId));
  const completedProjects = projects.filter(p => p.completionStatus === "completed");

  const techCount: Record<string, number> = {};
  for (const p of projects) {
    for (const t of p.technologies) {
      techCount[t] = (techCount[t] || 0) + 1;
    }
  }
  const strongestTech = Object.entries(techCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const roadmaps = await db.select().from(roadmapsTable).where(eq(roadmapsTable.userId, userId));
  let totalTasks = 0;
  let completedTasks = 0;
  for (const rm of roadmaps) {
    const milestones = await db.select().from(milestonesTable).where(eq(milestonesTable.roadmapId, rm.id));
    for (const ms of milestones) {
      const tasks = await db.select().from(tasksTable).where(eq(tasksTable.milestoneId, ms.id));
      totalTasks += tasks.length;
      completedTasks += tasks.filter(t => t.completed).length;
    }
  }
  const roadmapProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const allJobs = await db.select().from(jobsTable);
  const userSkills = new Set(projects.flatMap(p => p.technologies));
  const jobMatches = allJobs.filter(j =>
    j.requiredSkills.some(s => [...userSkills].some(us => us.toLowerCase() === s.toLowerCase()))
  ).length;

  const comfortComponent = Math.min(100, projects.length * 15 + completedProjects.length * 10);
  const portfolioComponent = Math.min(100, completedProjects.length * 25);
  const readinessScore = Math.round(comfortComponent * 0.35 + roadmapProgress * 0.25 + portfolioComponent * 0.15);

  res.json(GetDashboardSummaryResponse.parse({
    totalProjects: projects.length,
    completedProjects: completedProjects.length,
    strongestTech,
    readinessScore,
    roadmapProgress,
    totalJobMatches: jobMatches,
    profileComplete,
  }));
});

router.get("/dashboard/skill-gaps", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json([]);
    return;
  }

  const projects = await db.select().from(projectsTable).where(eq(projectsTable.userId, userId));
  const userSkills = new Set(projects.flatMap(p => p.technologies.map(t => t.toLowerCase())));

  const allJobs = await db.select().from(jobsTable);
  const demandedSkills: Record<string, number> = {};
  for (const job of allJobs) {
    for (const skill of job.requiredSkills) {
      demandedSkills[skill] = (demandedSkills[skill] || 0) + 1;
    }
  }

  const maxDemand = Math.max(...Object.values(demandedSkills), 1);

  const gaps = Object.entries(demandedSkills).map(([tech, count]) => {
    const requiredScore = Math.round((count / maxDemand) * 100);
    const hasSkill = userSkills.has(tech.toLowerCase());
    const techProjects = projects.filter(p =>
      p.technologies.some(t => t.toLowerCase() === tech.toLowerCase())
    );
    const currentScore = hasSkill ? Math.min(100, techProjects.length * 20) : 0;
    const gap = Math.max(0, requiredScore - currentScore);

    let priority: "low" | "medium" | "high" | "critical" = "low";
    if (gap > 70) priority = "critical";
    else if (gap > 50) priority = "high";
    else if (gap > 25) priority = "medium";

    let suggestion = "";
    if (gap === 0) suggestion = `You're strong in ${tech}! Keep building projects.`;
    else if (priority === "critical") suggestion = `${tech} is in high demand. Start learning immediately.`;
    else if (priority === "high") suggestion = `Build 2-3 projects using ${tech} to improve.`;
    else if (priority === "medium") suggestion = `Consider adding ${tech} to your next project.`;
    else suggestion = `${tech} knowledge would be a nice bonus.`;

    return { technology: tech, currentScore, requiredScore, gap, priority, suggestion };
  }).filter(g => g.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 10);

  res.json(GetSkillGapsResponse.parse(gaps));
});

router.get("/dashboard/recent-activity", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json([]);
    return;
  }

  const activities = await db.select().from(activityTable)
    .where(eq(activityTable.userId, userId))
    .orderBy(desc(activityTable.timestamp))
    .limit(10);

  res.json(GetRecentActivityResponse.parse(activities));
});

export default router;
