import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
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
  portfoliosTable,
  portfolioProjectsTable,
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

type PortfolioVisibility = "public" | "private";

function isVisibility(value: unknown): value is PortfolioVisibility {
  return value === "public" || value === "private";
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .trim();
  return slug || "portfolio";
}

async function generateUniqueSlug(base: string, existingId?: number | null): Promise<string> {
  let slug = base;
  let suffix = 2;
  while (true) {
    const [existing] = await db
      .select({ id: portfoliosTable.id })
      .from(portfoliosTable)
      .where(eq(portfoliosTable.slug, slug));
    if (!existing || (existingId && existing.id === existingId)) {
      return slug;
    }
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

function computeTechScores(projects: Array<{ technologies: string[]; difficultyLevel: string; completionStatus: string }>) {
  const techMap: Record<string, { count: number; complexitySum: number; completedCount: number }> = {};

  for (const project of projects) {
    const complexity = project.difficultyLevel === "advanced" ? 3 : project.difficultyLevel === "intermediate" ? 2 : 1;
    const completionScore = project.completionStatus === "completed"
      ? 1
      : project.completionStatus === "in_progress"
      ? 0.5
      : 0.2;

    for (const tech of project.technologies || []) {
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

  const maxPossible = Math.max(...Object.values(techMap).map((t) => t.complexitySum), 1);

  return Object.entries(techMap)
    .map(([technology, data]) => {
      const rawScore = (data.complexitySum / maxPossible) * 100;
      const comfortScore = Math.min(100, Math.round(rawScore));
      let confidenceLevel: "low" | "medium" | "high" = "low";
      if (data.count >= 4) confidenceLevel = "high";
      else if (data.count >= 2) confidenceLevel = "medium";

      return {
        technology,
        projectCount: data.count,
        comfortScore,
        confidenceLevel,
      };
    })
    .sort((a, b) => b.comfortScore - a.comfortScore);
}

function computePortfolioRating(projects: Array<{ difficultyLevel: string; completionStatus: string }>) {
  return projects.reduce((sum, project) => {
    const difficulty = project.difficultyLevel === "advanced" ? 3 : project.difficultyLevel === "intermediate" ? 2 : 1;
    const completion = project.completionStatus === "completed" ? 1 : project.completionStatus === "in_progress" ? 0.5 : 0.2;
    return sum + difficulty * completion;
  }, 0);
}

type PortfolioRow = {
  portfolioId: number;
  studentId: number;
  title: string;
  bio: string | null;
  avatarUrl: string | null;
  theme: string;
  visibility: PortfolioVisibility;
  slug: string;
  shareToken: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  studentName: string;
  studentEmail: string;
  studentAvatarUrl: string | null;
  projectId: number | null;
  projectTitle: string | null;
  projectDescription: string | null;
  projectTechnologies: string[] | null;
  projectDifficulty: string | null;
  projectCompletion: string | null;
  projectGithub: string | null;
  projectLive: string | null;
  projectScreenshot: string | null;
  projectDuration: string | null;
  projectRole: string | null;
  projectCategory: string | null;
  projectCreatedAt: Date | null;
  projectUpdatedAt: Date | null;
  displayOrder: number | null;
  isFeatured: boolean | null;
};

function buildPortfolioResponse(rows: PortfolioRow[]) {
  if (rows.length === 0) return null;
  const base = rows[0];
  const projects = rows
    .filter((row) => row.projectId)
    .map((row) => ({
      id: row.projectId as number,
      title: row.projectTitle || "Untitled Project",
      description: row.projectDescription,
      technologies: row.projectTechnologies || [],
      difficultyLevel: row.projectDifficulty || "beginner",
      completionStatus: row.projectCompletion || "planning",
      githubLink: row.projectGithub,
      liveLink: row.projectLive,
      screenshotUrl: row.projectScreenshot,
      duration: row.projectDuration,
      role: row.projectRole,
      category: row.projectCategory,
      createdAt: row.projectCreatedAt,
      updatedAt: row.projectUpdatedAt,
      displayOrder: row.displayOrder ?? 0,
      isFeatured: row.isFeatured ?? false,
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const techScores = computeTechScores(projects);
  const topTechs = techScores.slice(0, 4).map((t) => t.technology);

  return {
    id: base.portfolioId,
    studentId: base.studentId,
    title: base.title,
    bio: base.bio,
    avatarUrl: base.avatarUrl || base.studentAvatarUrl,
    theme: base.theme,
    visibility: base.visibility,
    slug: base.slug,
    shareToken: base.shareToken,
    publishedAt: base.publishedAt,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    student: {
      id: base.studentId,
      name: base.studentName,
      email: base.studentEmail,
      avatarUrl: base.studentAvatarUrl,
    },
    projects,
    projectsCount: projects.length,
    techScores,
    topTechs,
  };
}

async function getPortfolioRows(whereClause: any) {
  return db
    .select({
      portfolioId: portfoliosTable.id,
      studentId: portfoliosTable.studentId,
      title: portfoliosTable.title,
      bio: portfoliosTable.bio,
      avatarUrl: portfoliosTable.avatarUrl,
      theme: portfoliosTable.theme,
      visibility: portfoliosTable.visibility,
      slug: portfoliosTable.slug,
      shareToken: portfoliosTable.shareToken,
      publishedAt: portfoliosTable.publishedAt,
      createdAt: portfoliosTable.createdAt,
      updatedAt: portfoliosTable.updatedAt,
      studentName: usersTable.name,
      studentEmail: usersTable.email,
      studentAvatarUrl: usersTable.profilePhotoUrl,
      projectId: projectsTable.id,
      projectTitle: projectsTable.title,
      projectDescription: projectsTable.description,
      projectTechnologies: projectsTable.technologies,
      projectDifficulty: projectsTable.difficultyLevel,
      projectCompletion: projectsTable.completionStatus,
      projectGithub: projectsTable.githubLink,
      projectLive: projectsTable.liveLink,
      projectScreenshot: projectsTable.screenshotUrl,
      projectDuration: projectsTable.duration,
      projectRole: projectsTable.role,
      projectCategory: projectsTable.category,
      projectCreatedAt: projectsTable.createdAt,
      projectUpdatedAt: projectsTable.updatedAt,
      displayOrder: portfolioProjectsTable.displayOrder,
      isFeatured: portfolioProjectsTable.isFeatured,
    })
    .from(portfoliosTable)
    .innerJoin(usersTable, eq(usersTable.id, portfoliosTable.studentId))
    .leftJoin(portfolioProjectsTable, eq(portfolioProjectsTable.portfolioId, portfoliosTable.id))
    .leftJoin(projectsTable, eq(projectsTable.id, portfolioProjectsTable.projectId))
    .where(whereClause);
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

// ─── Portfolios ─────────────────────────────────────────────────────────────

router.post("/portfolios/generate", requireAuth, async (req, res): Promise<void> => {
  const userId = await getOrCreateUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(500).json({ error: "Failed to resolve user account" });
    return;
  }

  const [user] = await db.select({ name: usersTable.name, avatarUrl: usersTable.profilePhotoUrl }).from(usersTable).where(eq(usersTable.id, userId));
  const projects = await db.select().from(projectsTable).where(eq(projectsTable.userId, userId));
  const [existingPortfolio] = await db.select().from(portfoliosTable).where(eq(portfoliosTable.studentId, userId));

  const baseSlug = slugify(`${user?.name || "student"}-portfolio`);
  const slug = existingPortfolio?.slug || await generateUniqueSlug(baseSlug, existingPortfolio?.id ?? null);
  const shareToken = existingPortfolio?.shareToken || randomUUID();

  const portfolio = await db.transaction(async (tx) => {
    let portfolioId = existingPortfolio?.id ?? null;

    if (!portfolioId) {
      const [created] = await tx
        .insert(portfoliosTable)
        .values({
          studentId: userId,
          title: `${user?.name || "Student"}'s Portfolio`,
          bio: null,
          avatarUrl: user?.avatarUrl || null,
          theme: "default",
          visibility: "private",
          slug,
          shareToken,
        })
        .returning();
      portfolioId = created?.id ?? null;
    } else {
      await tx
        .update(portfoliosTable)
        .set({
          updatedAt: new Date(),
          avatarUrl: existingPortfolio.avatarUrl || user?.avatarUrl || null,
          slug,
          shareToken,
        })
        .where(eq(portfoliosTable.id, portfolioId));
    }

    if (!portfolioId) {
      return null;
    }

    const existingLinks = await tx
      .select({ projectId: portfolioProjectsTable.projectId, displayOrder: portfolioProjectsTable.displayOrder, isFeatured: portfolioProjectsTable.isFeatured })
      .from(portfolioProjectsTable)
      .where(eq(portfolioProjectsTable.portfolioId, portfolioId));

    const existingMap = new Map(existingLinks.map((link) => [link.projectId, link]));
    const orderedProjects = projects
      .map((project) => {
        const existing = existingMap.get(project.id);
        return {
          projectId: project.id,
          displayOrder: existing?.displayOrder ?? 9999,
          isFeatured: existing?.isFeatured ?? false,
          createdAt: project.createdAt,
        };
      })
      .sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
        return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
      })
      .map((item, index) => ({
        portfolioId,
        projectId: item.projectId,
        displayOrder: index + 1,
        isFeatured: item.isFeatured,
      }));

    await tx.delete(portfolioProjectsTable).where(eq(portfolioProjectsTable.portfolioId, portfolioId));

    if (orderedProjects.length > 0) {
      await tx.insert(portfolioProjectsTable).values(orderedProjects);
    }

    return portfolioId;
  });

  if (!portfolio) {
    res.status(500).json({ error: "Failed to generate portfolio" });
    return;
  }

  const rows = await getPortfolioRows(eq(portfoliosTable.id, portfolio));
  const response = buildPortfolioResponse(rows as PortfolioRow[]);
  res.json(response);
});

router.get("/portfolios/my", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(404).json({ error: "Portfolio not found" });
    return;
  }

  const rows = await getPortfolioRows(eq(portfoliosTable.studentId, userId));
  const response = buildPortfolioResponse(rows as PortfolioRow[]);
  if (!response) {
    res.status(404).json({ error: "Portfolio not found" });
    return;
  }

  res.json(response);
});

router.patch("/portfolios/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(404).json({ error: "Portfolio not found" });
    return;
  }

  const portfolioId = parseInt(req.params.id);
  if (isNaN(portfolioId)) {
    res.status(400).json({ error: "Invalid portfolio ID" });
    return;
  }

  const [portfolio] = await db.select().from(portfoliosTable).where(eq(portfoliosTable.id, portfolioId));
  if (!portfolio || portfolio.studentId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { title, bio, visibility, theme } = req.body || {};
  const update: Partial<typeof portfoliosTable.$inferInsert> = {};

  if (title && typeof title === "string") update.title = title.trim();
  if (bio !== undefined && (typeof bio === "string" || bio === null)) update.bio = bio ? bio.trim() : null;
  if (theme && typeof theme === "string") update.theme = theme.trim();
  if (visibility !== undefined) {
    if (!isVisibility(visibility)) {
      res.status(400).json({ error: "Invalid visibility value" });
      return;
    }
    update.visibility = visibility;
  }

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  await db.update(portfoliosTable).set(update).where(eq(portfoliosTable.id, portfolioId));

  const rows = await getPortfolioRows(eq(portfoliosTable.id, portfolioId));
  const response = buildPortfolioResponse(rows as PortfolioRow[]);
  res.json(response);
});

router.patch("/portfolios/:id/projects", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(404).json({ error: "Portfolio not found" });
    return;
  }

  const portfolioId = parseInt(req.params.id);
  if (isNaN(portfolioId)) {
    res.status(400).json({ error: "Invalid portfolio ID" });
    return;
  }

  const { projects } = req.body || {};
  if (!Array.isArray(projects)) {
    res.status(400).json({ error: "projects must be an array" });
    return;
  }

  const [portfolio] = await db.select().from(portfoliosTable).where(eq(portfoliosTable.id, portfolioId));
  if (!portfolio || portfolio.studentId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const existingLinks = await db
    .select({ projectId: portfolioProjectsTable.projectId })
    .from(portfolioProjectsTable)
    .where(eq(portfolioProjectsTable.portfolioId, portfolioId));
  const existingProjectIds = new Set(existingLinks.map((link) => link.projectId));

  for (const item of projects) {
    if (!item || typeof item.projectId !== "number") {
      res.status(400).json({ error: "Each project update must include projectId" });
      return;
    }
    if (!existingProjectIds.has(item.projectId)) {
      res.status(400).json({ error: "Project does not belong to portfolio" });
      return;
    }
  }

  await db.transaction(async (tx) => {
    for (const item of projects) {
      await tx
        .update(portfolioProjectsTable)
        .set({
          displayOrder: typeof item.displayOrder === "number" ? item.displayOrder : 0,
          isFeatured: typeof item.isFeatured === "boolean" ? item.isFeatured : false,
        })
        .where(and(eq(portfolioProjectsTable.portfolioId, portfolioId), eq(portfolioProjectsTable.projectId, item.projectId)));
    }
  });

  const rows = await getPortfolioRows(eq(portfoliosTable.id, portfolioId));
  const response = buildPortfolioResponse(rows as PortfolioRow[]);
  res.json(response);
});

router.post("/portfolios/:id/publish", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(404).json({ error: "Portfolio not found" });
    return;
  }

  const portfolioId = parseInt(req.params.id);
  if (isNaN(portfolioId)) {
    res.status(400).json({ error: "Invalid portfolio ID" });
    return;
  }

  const { visibility } = req.body || {};
  if (!isVisibility(visibility)) {
    res.status(400).json({ error: "Invalid visibility" });
    return;
  }

  const [portfolio] = await db.select().from(portfoliosTable).where(eq(portfoliosTable.id, portfolioId));
  if (!portfolio || portfolio.studentId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db
    .update(portfoliosTable)
    .set({ visibility, publishedAt: new Date() })
    .where(eq(portfoliosTable.id, portfolioId));

  const portfolioUrl = `/portfolio/${portfolio.slug}`;
  const shareLink = `/portfolio/private/${portfolio.shareToken}`;

  res.json({ portfolioUrl: visibility === "public" ? portfolioUrl : null, shareLink });
});

router.get("/portfolios/public", async (req, res): Promise<void> => {
  const techParam = typeof req.query.tech === "string" ? req.query.tech : "";
  const selectedTechs = techParam
    .split(",")
    .map((tech) => tech.trim())
    .filter(Boolean);
  const sortParam = typeof req.query.sort === "string" ? req.query.sort : "newest";

  const rows = await db
    .select({
      portfolioId: portfoliosTable.id,
      studentId: portfoliosTable.studentId,
      title: portfoliosTable.title,
      bio: portfoliosTable.bio,
      avatarUrl: portfoliosTable.avatarUrl,
      theme: portfoliosTable.theme,
      visibility: portfoliosTable.visibility,
      slug: portfoliosTable.slug,
      shareToken: portfoliosTable.shareToken,
      publishedAt: portfoliosTable.publishedAt,
      createdAt: portfoliosTable.createdAt,
      updatedAt: portfoliosTable.updatedAt,
      studentName: usersTable.name,
      studentEmail: usersTable.email,
      studentAvatarUrl: usersTable.profilePhotoUrl,
      projectId: projectsTable.id,
      projectTitle: projectsTable.title,
      projectDescription: projectsTable.description,
      projectTechnologies: projectsTable.technologies,
      projectDifficulty: projectsTable.difficultyLevel,
      projectCompletion: projectsTable.completionStatus,
      projectGithub: projectsTable.githubLink,
      projectLive: projectsTable.liveLink,
      projectScreenshot: projectsTable.screenshotUrl,
      projectDuration: projectsTable.duration,
      projectRole: projectsTable.role,
      projectCategory: projectsTable.category,
      projectCreatedAt: projectsTable.createdAt,
      projectUpdatedAt: projectsTable.updatedAt,
      displayOrder: portfolioProjectsTable.displayOrder,
      isFeatured: portfolioProjectsTable.isFeatured,
    })
    .from(portfoliosTable)
    .innerJoin(usersTable, eq(usersTable.id, portfoliosTable.studentId))
    .leftJoin(portfolioProjectsTable, eq(portfolioProjectsTable.portfolioId, portfoliosTable.id))
    .leftJoin(projectsTable, eq(projectsTable.id, portfolioProjectsTable.projectId))
    .where(and(eq(portfoliosTable.visibility, "public"), sql`${portfoliosTable.publishedAt} is not null`));

  const grouped = new Map<number, PortfolioRow[]>();
  for (const row of rows as PortfolioRow[]) {
    if (!grouped.has(row.portfolioId)) {
      grouped.set(row.portfolioId, []);
    }
    grouped.get(row.portfolioId)?.push(row);
  }

  const summaries = Array.from(grouped.values()).map((portfolioRows) => {
    const portfolio = buildPortfolioResponse(portfolioRows);
    if (!portfolio) return null;

    const techScoreMap = new Map(
      portfolio.techScores.map((score) => [score.technology.toLowerCase(), score.comfortScore]),
    );
    const missingTechCount = selectedTechs.reduce((count, tech) => {
      return techScoreMap.has(tech.toLowerCase()) ? count : count + 1;
    }, 0);
    const combinedTechScore = selectedTechs.reduce((sum, tech) => {
      return sum + (techScoreMap.get(tech.toLowerCase()) || 0);
    }, 0);

    return {
      id: portfolio.id,
      title: portfolio.title,
      bio: portfolio.bio,
      avatarUrl: portfolio.avatarUrl,
      slug: portfolio.slug,
      theme: portfolio.theme,
      publishedAt: portfolio.publishedAt,
      student: portfolio.student,
      projectsCount: portfolio.projectsCount,
      topTechs: portfolio.topTechs,
      techScores: portfolio.techScores,
      combinedTechScore: selectedTechs.length > 0 ? combinedTechScore : null,
      missingTechCount,
      portfolioRating: computePortfolioRating(portfolio.projects),
    };
  }).filter(Boolean) as Array<any>;

  const sortByNewest = (a: any, b: any) => (b.publishedAt?.getTime?.() || 0) - (a.publishedAt?.getTime?.() || 0);
  const sortByProjects = (a: any, b: any) => b.projectsCount - a.projectsCount;
  const sortByRating = (a: any, b: any) => b.portfolioRating - a.portfolioRating;

  const secondarySort = sortParam === "most_projects"
    ? sortByProjects
    : sortParam === "top_rated"
    ? sortByRating
    : sortByNewest;

  const sorted = summaries.sort((a, b) => {
    if (selectedTechs.length > 0) {
      if (a.missingTechCount !== b.missingTechCount) return a.missingTechCount - b.missingTechCount;
      if (a.combinedTechScore !== b.combinedTechScore) return b.combinedTechScore - a.combinedTechScore;
      return secondarySort(a, b);
    }
    return secondarySort(a, b);
  });

  res.json(sorted);
});

router.get("/p/:slug", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const rows = await getPortfolioRows(and(eq(portfoliosTable.slug, slug), eq(portfoliosTable.visibility, "public"), sql`${portfoliosTable.publishedAt} is not null`));
  const response = buildPortfolioResponse(rows as PortfolioRow[]);
  if (!response) {
    res.status(404).json({ error: "Portfolio not found" });
    return;
  }
  const { shareToken: _shareToken, ...publicResponse } = response;
  res.json(publicResponse);
});

router.get("/p/private/:token", async (req, res): Promise<void> => {
  const { token } = req.params;
  const rows = await getPortfolioRows(eq(portfoliosTable.shareToken, token));
  const response = buildPortfolioResponse(rows as PortfolioRow[]);
  if (!response) {
    res.status(404).json({ error: "Portfolio not found" });
    return;
  }
  res.json(response);
});

export default router;
