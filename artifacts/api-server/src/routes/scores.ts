import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, projectsTable, jobsTable, roadmapsTable, milestonesTable, tasksTable } from "@workspace/db";
import {
  GetTechComfortScoresResponse,
  GetMarketDemandScoresResponse,
  GetJobReadinessScoreResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function getUserId(clerkId: string): Promise<number | null> {
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user?.id ?? null;
}

router.get("/scores/tech-comfort", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json([]);
    return;
  }

  const projects = await db.select().from(projectsTable).where(eq(projectsTable.userId, userId));

  const techMap: Record<string, { count: number; complexitySum: number; completedCount: number }> = {};

  for (const project of projects) {
    const complexity = project.difficultyLevel === "advanced" ? 3 : project.difficultyLevel === "intermediate" ? 2 : 1;
    const completionScore = project.completionStatus === "completed" ? 1 : project.completionStatus === "in_progress" ? 0.5 : 0.2;

    for (const tech of project.technologies) {
      if (!techMap[tech]) {
        techMap[tech] = { count: 0, complexitySum: 0, completedCount: 0 };
      }
      techMap[tech].count += 1;
      techMap[tech].complexitySum += complexity * completionScore;
      if (project.completionStatus === "completed") {
        techMap[tech].completedCount += 1;
      }
    }
  }

  const maxPossible = Math.max(...Object.values(techMap).map(t => t.complexitySum), 1);

  const scores = Object.entries(techMap).map(([tech, data]) => {
    const rawScore = (data.complexitySum / maxPossible) * 100;
    const comfortScore = Math.min(100, Math.round(rawScore));
    let confidenceLevel: "low" | "medium" | "high" = "low";
    if (data.count >= 4) confidenceLevel = "high";
    else if (data.count >= 2) confidenceLevel = "medium";

    return {
      technology: tech,
      projectCount: data.count,
      comfortScore,
      confidenceLevel,
    };
  }).sort((a, b) => b.comfortScore - a.comfortScore);

  res.json(GetTechComfortScoresResponse.parse(scores));
});

router.get("/scores/market-demand", requireAuth, async (req, res): Promise<void> => {
  const allJobs = await db.select().from(jobsTable);

  const techJobCount: Record<string, number> = {};
  for (const job of allJobs) {
    for (const skill of job.requiredSkills) {
      techJobCount[skill] = (techJobCount[skill] || 0) + 1;
    }
  }

  const maxJobs = Math.max(...Object.values(techJobCount), 1);

  const scores = Object.entries(techJobCount).map(([tech, count]) => {
    const demandScore = Math.round((count / maxJobs) * 100);
    let trendDirection: "rising" | "stable" | "declining" = "stable";
    if (demandScore > 70) trendDirection = "rising";
    else if (demandScore < 30) trendDirection = "declining";

    return {
      technology: tech,
      totalJobs: count,
      demandScore,
      trendDirection,
      growthRate: Math.round((demandScore / 100) * 15 * 10) / 10,
    };
  }).sort((a, b) => b.demandScore - a.demandScore);

  res.json(GetMarketDemandScoresResponse.parse(scores));
});

router.get("/scores/job-readiness", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json(GetJobReadinessScoreResponse.parse({
      overallScore: 0,
      comfortComponent: 0,
      marketDemandComponent: 0,
      roadmapComponent: 0,
      portfolioComponent: 0,
      readinessStatus: "not_ready",
      suggestions: ["Create your profile to get started", "Add your first project"],
    }));
    return;
  }

  const projects = await db.select().from(projectsTable).where(eq(projectsTable.userId, userId));
  const completedProjects = projects.filter(p => p.completionStatus === "completed");

  const comfortComponent = Math.min(100, projects.length * 15 + completedProjects.length * 10);

  const allJobs = await db.select().from(jobsTable);
  const userSkills = new Set(projects.flatMap(p => p.technologies));
  const demandedSkills = new Set(allJobs.flatMap(j => j.requiredSkills));
  const overlap = [...userSkills].filter(s => demandedSkills.has(s));
  const marketDemandComponent = demandedSkills.size > 0 ? Math.round((overlap.length / demandedSkills.size) * 100) : 0;

  const roadmaps = await db.select().from(roadmapsTable).where(eq(roadmapsTable.userId, userId));
  let roadmapComponent = 0;
  if (roadmaps.length > 0) {
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
    roadmapComponent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }

  const portfolioComponent = Math.min(100, completedProjects.length * 25);

  const overallScore = Math.round(
    comfortComponent * 0.35 +
    marketDemandComponent * 0.25 +
    roadmapComponent * 0.25 +
    portfolioComponent * 0.15
  );

  let readinessStatus: "not_ready" | "needs_improvement" | "interview_ready" | "job_ready" = "not_ready";
  if (overallScore >= 80) readinessStatus = "job_ready";
  else if (overallScore >= 60) readinessStatus = "interview_ready";
  else if (overallScore >= 30) readinessStatus = "needs_improvement";

  const suggestions: string[] = [];
  if (projects.length < 3) suggestions.push("Add more projects to strengthen your portfolio");
  if (completedProjects.length < 2) suggestions.push("Complete more projects to boost your score");
  if (roadmaps.length === 0) suggestions.push("Generate a learning roadmap to track your progress");
  if (roadmapComponent < 50 && roadmaps.length > 0) suggestions.push("Complete more roadmap tasks to improve readiness");
  if (overlap.length < 3) suggestions.push("Learn technologies that are in high demand");

  res.json(GetJobReadinessScoreResponse.parse({
    overallScore,
    comfortComponent,
    marketDemandComponent,
    roadmapComponent,
    portfolioComponent,
    readinessStatus,
    suggestions,
  }));
});

export default router;
