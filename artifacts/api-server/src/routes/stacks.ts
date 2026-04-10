import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  usersTable,
  roadmapsTable,
  milestonesTable,
  tasksTable,
  domainsTable,
  domainSkillMapTable,
  stackRoadmapMapTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function getUserId(clerkId: string): Promise<number | null> {
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user?.id ?? null;
}

// ─── S5.2 + S5.7: Stack Detail View with Task Tracking ───────────────────────

router.get("/stacks/:id/detail", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const roadmapId = parseInt(req.params.id);
  if (isNaN(roadmapId)) {
    res.status(400).json({ error: "Invalid stack ID" });
    return;
  }

  // The "stack" is a roadmap owned by the user
  const [roadmap] = await db.select().from(roadmapsTable)
    .where(and(eq(roadmapsTable.id, roadmapId), eq(roadmapsTable.userId, userId)));
  if (!roadmap) {
    res.status(404).json({ error: "Stack not found" });
    return;
  }

  // Get milestones and tasks for tracking (S5.7)
  const milestones = await db.select().from(milestonesTable).where(eq(milestonesTable.roadmapId, roadmap.id));
  let totalTasks = 0;
  let completedTasks = 0;
  const milestoneDetails = [];

  for (const ms of milestones) {
    const tasks = await db.select().from(tasksTable).where(eq(tasksTable.milestoneId, ms.id));
    const msCompleted = tasks.filter(t => t.completed).length;
    totalTasks += tasks.length;
    completedTasks += msCompleted;

    milestoneDetails.push({
      id: ms.id,
      title: ms.title,
      description: ms.description,
      estimatedDuration: ms.estimatedDuration,
      industryRelevance: ms.industryRelevance,
      status: tasks.length > 0 && tasks.every(t => t.completed) ? "completed" : tasks.some(t => t.completed) ? "in_progress" : "not_started",
      totalTasks: tasks.length,
      completedTasks: msCompleted,
    });
  }

  // Check for linked domain (stack) info
  const [mapping] = await db.select().from(stackRoadmapMapTable)
    .where(eq(stackRoadmapMapTable.roadmapId, roadmapId));

  let domainInfo = null;
  if (mapping) {
    const [domain] = await db.select().from(domainsTable).where(eq(domainsTable.id, mapping.stackId));
    if (domain) {
      const skills = await db.select().from(domainSkillMapTable).where(eq(domainSkillMapTable.domainId, domain.id));
      domainInfo = {
        id: domain.id,
        name: domain.name,
        description: domain.description,
        skills: skills.map(s => s.skill),
      };
    }
  }

  // Technologies/skills in this stack (extracted from the roadmap's technology)
  const technologies = [roadmap.technology];

  res.json({
    id: roadmap.id,
    name: roadmap.technology,
    description: `Learning path for ${roadmap.technology}`,
    technologies,
    createdAt: roadmap.createdAt.toISOString(),
    // S5.7: Task tracking
    totalTasks,
    completedTasks,
    progressPercent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    milestones: milestoneDetails,
    // S5.11: Domain linkage
    linkedDomain: domainInfo,
    roadmapId: roadmap.id,
  });
});

// ─── S5.11: Link/unlink a domain to a roadmap ────────────────────────────────

router.post("/stacks/:id/link-domain", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const roadmapId = parseInt(req.params.id);
  const { domainId } = req.body;

  if (isNaN(roadmapId) || !domainId || typeof domainId !== "number") {
    res.status(400).json({ error: "Invalid roadmapId or domainId" });
    return;
  }

  // Verify roadmap belongs to user
  const [roadmap] = await db.select().from(roadmapsTable)
    .where(and(eq(roadmapsTable.id, roadmapId), eq(roadmapsTable.userId, userId)));
  if (!roadmap) {
    res.status(404).json({ error: "Roadmap not found" });
    return;
  }

  // Check if already linked
  const [existing] = await db.select().from(stackRoadmapMapTable)
    .where(and(
      eq(stackRoadmapMapTable.stackId, domainId),
      eq(stackRoadmapMapTable.roadmapId, roadmapId),
    ));
  if (existing) {
    res.status(409).json({ error: "Already linked" });
    return;
  }

  const [map] = await db.insert(stackRoadmapMapTable).values({
    stackId: domainId,
    roadmapId,
  }).returning();

  res.status(201).json(map);
});

// ─── S5.3: List domains for stack tooltips ────────────────────────────────────
// This endpoint provides domain info for the "Why this stack?" tooltip

router.get("/stacks/domain-suggestions", requireAuth, async (req, res): Promise<void> => {
  const domains = await db.select().from(domainsTable).where(eq(domainsTable.isVisible, true));

  const domainSuggestions = await Promise.all(domains.map(async (d) => {
    const skills = await db.select().from(domainSkillMapTable).where(eq(domainSkillMapTable.domainId, d.id));
    return {
      id: d.id,
      name: d.name,
      description: d.description,
      skills: skills.map(s => s.skill),
      priority: d.priority,
    };
  }));

  res.json(domainSuggestions);
});

export default router;
