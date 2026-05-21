import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  usersTable,
  projectsTable,
  jobsTable,
  roadmapsTable,
  milestonesTable,
  tasksTable,
  userSkillsTable,
  userCertificationsTable,
  userScoreWeightsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getUserScoringWeights, type ScoringWeights } from "../services/scoring.service";

const router: IRouter = Router();

async function getUserId(clerkId: string): Promise<number | null> {
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user?.id ?? null;
}

// ─── S3.4: Get current weights ────────────────────────────────────────────────

router.get("/analysis/weights", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const w = await getUserScoringWeights(userId);
  res.json({
    weights: [
      { dimension: "projects", weight: w.projectsWeight },
      { dimension: "skills", weight: w.skillsWeight },
      { dimension: "certifications", weight: w.certificationsWeight },
      { dimension: "trendAlignment", weight: w.trendAlignmentWeight },
      { dimension: "roadmapCompletion", weight: w.roadmapCompletionWeight },
    ],
  });
});

// ─── S3.4: Save weights ──────────────────────────────────────────────────────

router.put("/analysis/weights", requireAuth, async (req, res): Promise<void> => {
  res.status(403).json({ error: "Manual weight configuration is disabled. Scoring weights are now automatically optimized based on your portfolio activity." });
});

// ─── S3.6: Strength Breakdown ─────────────────────────────────────────────────

router.get("/analysis/strength-breakdown", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json({ dimensions: [], insight: "Create your profile to see your strength breakdown." });
    return;
  }

  const weights = await getUserScoringWeights(userId);

  // Projects score
  const projects = await db.select().from(projectsTable).where(and(eq(projectsTable.userId, userId), eq(projectsTable.completionStatus, "completed")));
  const completedProjects = projects;
  const projectsScore = Math.min(100, completedProjects.length * 25);

  // Skills score (from user_skills table — S2.4)
  const skills = await db.select().from(userSkillsTable).where(eq(userSkillsTable.userId, userId));
  const skillLevelMap: Record<string, number> = { beginner: 20, intermediate: 50, advanced: 80, expert: 100 };
  const skillsScore = skills.length > 0
    ? Math.min(100, Math.round(skills.reduce((sum, s) => sum + (skillLevelMap[s.proficiencyLevel] || 20), 0) / skills.length))
    : 0;

  // Certifications score (from user_certifications table — S2.4)
  const certifications = await db.select().from(userCertificationsTable).where(eq(userCertificationsTable.userId, userId));
  const certificationsScore = Math.min(100, certifications.length * 33); // 3 certs = 100

  // Trend alignment score
  const allJobs = await db.select().from(jobsTable);
  const userSkillNames = new Set([
    ...projects.flatMap(p => p.technologies.map(t => t.toLowerCase())),
    ...skills.map(s => s.name.toLowerCase()),
  ]);
  const demandedSkills: Record<string, number> = {};
  for (const job of allJobs) {
    for (const skill of job.requiredSkills) {
      const s = skill.toLowerCase();
      demandedSkills[s] = (demandedSkills[s] || 0) + 1;
    }
  }
  const topDemanded = Object.entries(demandedSkills).sort((a, b) => b[1] - a[1]).slice(0, 20);
  const trendMatched = topDemanded.filter(([skill]) => userSkillNames.has(skill)).length;
  const trendAlignmentScore = topDemanded.length > 0 ? Math.round((trendMatched / topDemanded.length) * 100) : 0;

  // Roadmap completion score
  const roadmaps = await db.select().from(roadmapsTable).where(eq(roadmapsTable.userId, userId));
  let roadmapCompletionScore = 0;
  if (roadmaps.length > 0) {
    let totalTasks = 0, completedTasks = 0;
    for (const rm of roadmaps) {
      const milestones = await db.select().from(milestonesTable).where(eq(milestonesTable.roadmapId, rm.id));
      for (const ms of milestones) {
        const tasks = await db.select().from(tasksTable).where(eq(tasksTable.milestoneId, ms.id));
        totalTasks += tasks.length;
        completedTasks += tasks.filter(t => t.completed).length;
      }
    }
    roadmapCompletionScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }

  const dimensions = [
    { dimension: "projects", label: "Projects", score: projectsScore, weight: weights.projectsWeight },
    { dimension: "skills", label: "Skills", score: skillsScore, weight: weights.skillsWeight },
    { dimension: "certifications", label: "Certifications", score: certificationsScore, weight: weights.certificationsWeight },
    { dimension: "trendAlignment", label: "Trend Alignment", score: trendAlignmentScore, weight: weights.trendAlignmentWeight },
    { dimension: "roadmapCompletion", label: "Roadmap Completion", score: roadmapCompletionScore, weight: weights.roadmapCompletionWeight },
  ];

  // Generate rule-based insight
  const sorted = [...dimensions].sort((a, b) => (b.score * b.weight) - (a.score * a.weight));
  const strongest = sorted[0];
  const weakest = sorted.filter(d => d.weight > 0).sort((a, b) => a.score - b.score)[0];

  let insight = "";
  if (strongest && weakest && strongest.dimension !== weakest.dimension) {
    insight = `Your ${strongest.label.toLowerCase()} score is strong (${strongest.score}%), `;
    insight += `but ${weakest.label.toLowerCase()} coverage is low (${weakest.score}%). `;
    insight += `Focus on improving ${weakest.label.toLowerCase()} to boost your overall readiness.`;
  } else if (projects.length === 0 && skills.length === 0) {
    insight = "Add projects and skills to your portfolio to start building your strength profile.";
  } else {
    insight = "Good progress across dimensions! Keep building projects and adding skills.";
  }

  res.json({ dimensions, insight });
});

// ─── S3.8: Enhanced Trend Alignment ───────────────────────────────────────────

router.get("/analysis/market-alignment", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json({
      matchPercentage: 0,
      userMatchedSkills: [],
      trendDataAvailable: false,
    });
    return;
  }

  // Collect user skills from S2.4 user_skills + project technologies
  const projects = await db.select().from(projectsTable).where(and(eq(projectsTable.userId, userId), eq(projectsTable.completionStatus, "completed")));
  const skills = await db.select().from(userSkillsTable).where(eq(userSkillsTable.userId, userId));

  const userSkillSet = new Set([
    ...projects.flatMap(p => p.technologies.map(t => t.toLowerCase())),
    ...skills.map(s => s.name.toLowerCase()),
  ]);

  // Try to use job data as trend proxy
  const allJobs = await db.select().from(jobsTable);

  if (allJobs.length === 0) {
    // Graceful degradation: no trend data
    res.json({
      matchPercentage: 0,
      userMatchedSkills: [...userSkillSet],
      trendDataAvailable: false,
    });
    return;
  }

  // Build demand frequency map
  const demandMap: Record<string, number> = {};
  for (const job of allJobs) {
    for (const skill of job.requiredSkills) {
      const s = skill.toLowerCase();
      demandMap[s] = (demandMap[s] || 0) + 1;
    }
  }

  const topTrending = Object.entries(demandMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const totalTrending = topTrending.length;
  const userMatchedSkills: string[] = [];
  for (const [skill, count] of topTrending) {
    if (userSkillSet.has(skill)) {
      userMatchedSkills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
    }
  }

  const matchPercentage = totalTrending > 0 ? Math.round((userMatchedSkills.length / totalTrending) * 100) : 0;

  res.json({
    matchPercentage,
    userMatchedSkills,
    trendDataAvailable: true,
  });
});

export default router;
