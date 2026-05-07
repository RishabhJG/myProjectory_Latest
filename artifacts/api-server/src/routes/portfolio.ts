import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
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
  portfolioSharesTable,
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

  // Handle development mock users (bypass Clerk API lookup)
  const isDevMockUser = process.env.NODE_ENV === "development" &&
    (clerkId === "dev_user_id" || clerkId === "mock_admin_id");

  if (isDevMockUser) {
    logger.info({ clerkId }, "Creating development mock user in database...");
    const [user] = await db.insert(usersTable).values({
      clerkId,
      name: clerkId === "mock_admin_id" ? "Admin User" : "Development User",
      email: `${clerkId}@localhost`
    }).returning({ id: usersTable.id });
    logger.info({ clerkId, userId: user?.id }, "Auto-created development user profile");
    return user?.id ?? null;
  }

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

function normalizeSkillName(value: string) {
  return value.trim().toLowerCase();
}

function buildTechStackSummary(technologies: string[]) {
  const techCounts = new Map<string, number>();
  technologies.forEach((tech) => {
    const name = tech.trim();
    if (!name) return;
    techCounts.set(name, (techCounts.get(name) ?? 0) + 1);
  });

  return Array.from(techCounts.entries())
    .map(([name, projectCount]) => ({ name, projectCount }))
    .sort((a, b) => b.projectCount - a.projectCount || a.name.localeCompare(b.name));
}

async function buildPortfolioForUser(userId: number) {
  const [user] = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    college: usersTable.college,
    degree: usersTable.degree,
    graduationYear: usersTable.graduationYear,
    preferredDomain: usersTable.preferredDomain,
    profilePhotoUrl: usersTable.profilePhotoUrl,
    skills: usersTable.skills,
  }).from(usersTable).where(eq(usersTable.id, userId));

  if (!user) return null;

  const projects = await db.select().from(projectsTable).where(and(
    eq(projectsTable.userId, userId),
    eq(projectsTable.completionStatus, "completed"),
  ));

  const skills = await db.select({
    name: userSkillsTable.name,
    proficiencyLevel: userSkillsTable.proficiencyLevel,
  }).from(userSkillsTable).where(eq(userSkillsTable.userId, userId));

  const projectTechnologies = projects.flatMap((project) => project.technologies || []);
  const techStackSummary = buildTechStackSummary(projectTechnologies);

  const normalizedProjects = projects.map((project) => ({
    ...project,
    completionDate: project.updatedAt ?? project.createdAt,
  }));

  return {
    user,
    projects: normalizedProjects,
    skills,
    techStackSummary,
    generatedAt: new Date().toISOString(),
  };
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

// ─── Portfolio Generation & Sharing ─────────────────────────────────────────

router.get("/portfolio/generate", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const portfolio = await buildPortfolioForUser(userId);
  if (!portfolio) {
    res.status(404).json({ error: "Portfolio not found" });
    return;
  }

  res.json(portfolio);
});

router.get("/portfolio/share", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json(null);
    return;
  }

  const [share] = await db.select().from(portfolioSharesTable).where(eq(portfolioSharesTable.userId, userId));
  res.json(share ?? null);
});

router.post("/portfolio/share", requireAuth, async (req, res): Promise<void> => {
  const userId = await getOrCreateUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(500).json({ error: "Failed to resolve user account" });
    return;
  }

  const visibility = typeof req.body?.visibility === "string" ? req.body.visibility : "private";
  if (!(["public", "private"].includes(visibility))) {
    res.status(400).json({ error: "Invalid visibility value" });
    return;
  }

  const [existing] = await db.select().from(portfolioSharesTable)
    .where(eq(portfolioSharesTable.userId, userId));

  if (existing) {
    const [updated] = await db.update(portfolioSharesTable)
      .set({ visibility })
      .where(eq(portfolioSharesTable.userId, userId))
      .returning();
    res.json(updated);
    return;
  }

  const [created] = await db.insert(portfolioSharesTable).values({
    userId,
    shareId: randomUUID(),
    visibility,
  }).returning();

  res.status(201).json(created);
});

router.get("/portfolio/share/:shareId", async (req, res): Promise<void> => {
  const shareId = req.params.shareId;
  if (!shareId) {
    res.status(400).json({ error: "Share ID is required" });
    return;
  }

  const [share] = await db.select().from(portfolioSharesTable)
    .where(eq(portfolioSharesTable.shareId, shareId));
  if (!share) {
    res.status(404).json({ error: "Share link not found" });
    return;
  }

  const portfolio = await buildPortfolioForUser(share.userId);
  if (!portfolio) {
    res.status(404).json({ error: "Portfolio not found" });
    return;
  }

  res.json({
    ...portfolio,
    share: {
      shareId: share.shareId,
      visibility: share.visibility,
    },
  });
});

router.get("/portfolio/public", async (req, res): Promise<void> => {
  const [shares, skillsFilter] = await Promise.all([
    db.select({
      shareId: portfolioSharesTable.shareId,
      userId: portfolioSharesTable.userId,
      visibility: portfolioSharesTable.visibility,
      createdAt: portfolioSharesTable.createdAt,
      updatedAt: portfolioSharesTable.updatedAt,
      name: usersTable.name,
      college: usersTable.college,
      degree: usersTable.degree,
      graduationYear: usersTable.graduationYear,
      preferredDomain: usersTable.preferredDomain,
      profilePhotoUrl: usersTable.profilePhotoUrl,
      profileSkills: usersTable.skills,
    })
      .from(portfolioSharesTable)
      .innerJoin(usersTable, eq(portfolioSharesTable.userId, usersTable.id))
      .where(eq(portfolioSharesTable.visibility, "public")),
    Promise.resolve(
      typeof req.query.skills === "string"
        ? req.query.skills.split(",").map((skill) => normalizeSkillName(skill)).filter(Boolean)
        : []
    ),
  ]);

  if (shares.length === 0) {
    res.json([]);
    return;
  }

  const userIds = shares.map((share) => share.userId);

  const [skillRows, projectRows] = await Promise.all([
    db.select({
      userId: userSkillsTable.userId,
      name: userSkillsTable.name,
      proficiencyLevel: userSkillsTable.proficiencyLevel,
    })
      .from(userSkillsTable)
      .where(inArray(userSkillsTable.userId, userIds)),
    db.select({
      userId: projectsTable.userId,
      technologies: projectsTable.technologies,
    })
      .from(projectsTable)
      .where(and(
        inArray(projectsTable.userId, userIds),
        eq(projectsTable.completionStatus, "completed"),
      )),
  ]);

  const skillsByUser = new Map<number, { name: string; proficiencyLevel: string }[]>();
  skillRows.forEach((row) => {
    const existing = skillsByUser.get(row.userId) ?? [];
    existing.push({ name: row.name, proficiencyLevel: row.proficiencyLevel });
    skillsByUser.set(row.userId, existing);
  });

  const projectTechByUser = new Map<number, string[]>();
  const projectCountByUser = new Map<number, number>();
  projectRows.forEach((row) => {
    const existing = projectTechByUser.get(row.userId) ?? [];
    existing.push(...(row.technologies || []));
    projectTechByUser.set(row.userId, existing);
    projectCountByUser.set(row.userId, (projectCountByUser.get(row.userId) ?? 0) + 1);
  });

  const items = shares.map((share) => {
    const userSkills = skillsByUser.get(share.userId) ?? [];
    const projectTechs = projectTechByUser.get(share.userId) ?? [];
    const profileSkills = share.profileSkills || [];
    const allSkills = Array.from(new Set([
      ...userSkills.map((skill) => skill.name),
      ...projectTechs,
      ...profileSkills,
    ])).filter(Boolean);

    const normalizedSkillSet = new Set(allSkills.map((skill) => normalizeSkillName(skill)));
    const matchCount = skillsFilter.length === 0
      ? 0
      : skillsFilter.filter((skill) => normalizedSkillSet.has(skill)).length;

    const techStackSummary = buildTechStackSummary(projectTechs).slice(0, 6);

    return {
      shareId: share.shareId,
      visibility: share.visibility,
      projectCount: projectCountByUser.get(share.userId) ?? 0,
      matchCount,
      topTechnologies: techStackSummary,
      skills: allSkills,
      user: {
        name: share.name,
        college: share.college,
        degree: share.degree,
        graduationYear: share.graduationYear,
        preferredDomain: share.preferredDomain,
        profilePhotoUrl: share.profilePhotoUrl,
      },
      updatedAt: share.updatedAt,
    };
  });

  const filtered = skillsFilter.length > 0
    ? items.filter((item) => item.matchCount > 0)
    : items;

  filtered.sort((a, b) => b.matchCount - a.matchCount || a.user.name.localeCompare(b.user.name));

  res.json(filtered);
});

router.get("/portfolio/public/skills", async (_req, res): Promise<void> => {
  const shares = await db.select({
    userId: portfolioSharesTable.userId,
    profileSkills: usersTable.skills,
  })
    .from(portfolioSharesTable)
    .innerJoin(usersTable, eq(portfolioSharesTable.userId, usersTable.id))
    .where(eq(portfolioSharesTable.visibility, "public"));

  if (shares.length === 0) {
    res.json([]);
    return;
  }

  const userIds = shares.map((share) => share.userId);
  const [skillRows, projectRows] = await Promise.all([
    db.select({
      userId: userSkillsTable.userId,
      name: userSkillsTable.name,
    }).from(userSkillsTable).where(inArray(userSkillsTable.userId, userIds)),
    db.select({
      userId: projectsTable.userId,
      technologies: projectsTable.technologies,
    })
      .from(projectsTable)
      .where(and(
        inArray(projectsTable.userId, userIds),
        eq(projectsTable.completionStatus, "completed"),
      )),
  ]);

  const skillSet = new Set<string>();
  shares.forEach((share) => {
    (share.profileSkills || []).forEach((skill) => {
      if (skill?.trim()) skillSet.add(skill.trim());
    });
  });
  skillRows.forEach((row) => {
    if (row.name?.trim()) skillSet.add(row.name.trim());
  });
  projectRows.forEach((row) => {
    (row.technologies || []).forEach((tech) => {
      if (tech?.trim()) skillSet.add(tech.trim());
    });
  });

  const skills = Array.from(skillSet).sort((a, b) => a.localeCompare(b));
  res.json(skills);
});

export default router;
