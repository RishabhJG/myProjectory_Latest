import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import {
  db,
  usersTable,
  userSkillsTable,
  userCertificationsTable,
  projectStackTagsTable,
  projectsTable,
  roadmapsTable,
  activityTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getUserId(clerkId: string): Promise<number | null> {
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user?.id ?? null;
}

async function getOrCreateUserId(clerkId: string): Promise<number | null> {
  const existing = await getUserId(clerkId);
  if (existing) return existing;

  try {
    const clerkUser = await clerkClient.users.getUser(clerkId);
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "User";
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const [user] = await db.insert(usersTable).values({ clerkId, name, email }).returning({ id: usersTable.id });
    logger.info({ clerkId }, "Auto-created user profile from Clerk data");
    return user?.id ?? null;
  } catch (err) {
    logger.error({ clerkId, err }, "Failed to auto-create user from Clerk data");
    return null;
  }
}

// ─── Skills ───────────────────────────────────────────────────────────────────

router.get("/portfolio/skills", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json([]);
    return;
  }
  const skills = await db.select().from(userSkillsTable).where(eq(userSkillsTable.userId, userId));
  res.json(skills);
});

router.post("/portfolio/skills", requireAuth, async (req, res): Promise<void> => {
  const userId = await getOrCreateUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(500).json({ error: "Failed to resolve user account" });
    return;
  }

  const { name, proficiencyLevel } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Skill name is required" });
    return;
  }

  const validLevels = ["beginner", "intermediate", "advanced", "expert"];
  const level = validLevels.includes(proficiencyLevel) ? proficiencyLevel : "beginner";

  const [skill] = await db.insert(userSkillsTable).values({
    userId,
    name: name.trim(),
    proficiencyLevel: level,
  }).returning();

  await db.insert(activityTable).values({
    userId,
    type: "project_updated",
    title: `Added skill: ${skill.name}`,
    description: `Proficiency: ${skill.proficiencyLevel}`,
  });

  res.status(201).json(skill);
});

router.delete("/portfolio/skills/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(404).json({ error: "Skill not found" });
    return;
  }

  const skillId = parseInt(req.params.id);
  if (isNaN(skillId)) {
    res.status(400).json({ error: "Invalid skill ID" });
    return;
  }

  const [deleted] = await db.delete(userSkillsTable)
    .where(and(eq(userSkillsTable.id, skillId), eq(userSkillsTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Skill not found" });
    return;
  }

  res.sendStatus(204);
});

// ─── Certifications ───────────────────────────────────────────────────────────

router.get("/portfolio/certifications", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json([]);
    return;
  }
  const certs = await db.select().from(userCertificationsTable).where(eq(userCertificationsTable.userId, userId));
  res.json(certs);
});

router.post("/portfolio/certifications", requireAuth, async (req, res): Promise<void> => {
  const userId = await getOrCreateUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(500).json({ error: "Failed to resolve user account" });
    return;
  }

  const { name, issuingBody, dateObtained, url } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Certification name is required" });
    return;
  }
  if (!issuingBody || typeof issuingBody !== "string" || issuingBody.trim().length === 0) {
    res.status(400).json({ error: "Issuing body is required" });
    return;
  }

  const [cert] = await db.insert(userCertificationsTable).values({
    userId,
    name: name.trim(),
    issuingBody: issuingBody.trim(),
    dateObtained: dateObtained || null,
    url: url || null,
  }).returning();

  await db.insert(activityTable).values({
    userId,
    type: "project_updated",
    title: `Added certification: ${cert.name}`,
    description: `Issued by ${cert.issuingBody}`,
  });

  res.status(201).json(cert);
});

router.delete("/portfolio/certifications/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(404).json({ error: "Certification not found" });
    return;
  }

  const certId = parseInt(req.params.id);
  if (isNaN(certId)) {
    res.status(400).json({ error: "Invalid certification ID" });
    return;
  }

  const [deleted] = await db.delete(userCertificationsTable)
    .where(and(eq(userCertificationsTable.id, certId), eq(userCertificationsTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Certification not found" });
    return;
  }

  res.sendStatus(204);
});

// ─── Project-Stack Tags (S2.5) ────────────────────────────────────────────────

router.get("/portfolio/projects/:id/stack-tags", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json([]);
    return;
  }

  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  // Verify project belongs to user
  const [project] = await db.select({ id: projectsTable.id }).from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Fetch tags with roadmap technology info
  const tags = await db
    .select({
      id: projectStackTagsTable.id,
      projectId: projectStackTagsTable.projectId,
      stackId: projectStackTagsTable.stackId,
      taggedAt: projectStackTagsTable.taggedAt,
      technology: roadmapsTable.technology,
    })
    .from(projectStackTagsTable)
    .innerJoin(roadmapsTable, eq(projectStackTagsTable.stackId, roadmapsTable.id))
    .where(eq(projectStackTagsTable.projectId, projectId));

  res.json(tags);
});

router.post("/portfolio/projects/:id/stack-tags", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(500).json({ error: "Failed to resolve user account" });
    return;
  }

  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const { stackId } = req.body;
  if (!stackId || typeof stackId !== "number") {
    res.status(400).json({ error: "stackId is required and must be a number" });
    return;
  }

  // Verify project belongs to user
  const [project] = await db.select({ id: projectsTable.id, title: projectsTable.title }).from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Verify roadmap belongs to user
  const [roadmap] = await db.select({ id: roadmapsTable.id, technology: roadmapsTable.technology }).from(roadmapsTable)
    .where(and(eq(roadmapsTable.id, stackId), eq(roadmapsTable.userId, userId)));
  if (!roadmap) {
    res.status(404).json({ error: "Stack/Roadmap not found" });
    return;
  }

  // Check for existing tag
  const [existing] = await db.select().from(projectStackTagsTable)
    .where(and(
      eq(projectStackTagsTable.projectId, projectId),
      eq(projectStackTagsTable.stackId, stackId)
    ));
  if (existing) {
    res.status(409).json({ error: "Project is already tagged to this stack" });
    return;
  }

  const [tag] = await db.insert(projectStackTagsTable).values({
    projectId,
    stackId,
  }).returning();

  await db.insert(activityTable).values({
    userId,
    type: "project_updated",
    title: `Tagged project "${project.title}" to ${roadmap.technology}`,
    description: `Linked to roadmap stack`,
  });

  res.status(201).json({ ...tag, technology: roadmap.technology });
});

router.delete("/portfolio/projects/:id/stack-tags/:tagId", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(404).json({ error: "Tag not found" });
    return;
  }

  const projectId = parseInt(req.params.id);
  const tagId = parseInt(req.params.tagId);
  if (isNaN(projectId) || isNaN(tagId)) {
    res.status(400).json({ error: "Invalid IDs" });
    return;
  }

  // Verify project belongs to user
  const [project] = await db.select({ id: projectsTable.id }).from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [deleted] = await db.delete(projectStackTagsTable)
    .where(and(
      eq(projectStackTagsTable.id, tagId),
      eq(projectStackTagsTable.projectId, projectId)
    ))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Tag not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
