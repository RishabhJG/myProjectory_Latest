import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { db, usersTable, projectsTable, activityTable } from "@workspace/db";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  GetProjectResponse,
  UpdateProjectParams,
  UpdateProjectResponse,
  DeleteProjectParams,
  ListProjectsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

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

router.get("/projects", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json([]);
    return;
  }
  const projects = await db.select().from(projectsTable).where(eq(projectsTable.userId, userId));
  res.json(ListProjectsResponse.parse(projects));
});

router.post("/projects", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;

  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    logger.warn({ clerkId, errors: parsed.error.flatten() }, "Invalid project body");
    res.status(400).json({ error: "Invalid project data", details: parsed.error.flatten() });
    return;
  }

  const userId = await getOrCreateUserId(clerkId);
  if (!userId) {
    logger.error({ clerkId }, "Could not resolve user ID for project creation");
    res.status(500).json({ error: "Failed to resolve user account" });
    return;
  }

  const [project] = await db.insert(projectsTable).values({
    ...parsed.data,
    userId,
  }).returning();

  await db.insert(activityTable).values({
    userId,
    type: "project_added",
    title: `Added project: ${project.title}`,
    description: `New ${parsed.data.difficultyLevel} project with ${parsed.data.technologies.join(", ")}`,
  });

  res.status(201).json(GetProjectResponse.parse(project));
});

router.get("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [project] = await db.select().from(projectsTable)
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, userId)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(GetProjectResponse.parse(project));
});

router.patch("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [project] = await db.update(projectsTable)
    .set(parsed.data)
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, userId)))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await db.insert(activityTable).values({
    userId,
    type: "project_updated",
    title: `Updated project: ${project.title}`,
    description: `Project updated`,
  });

  res.json(UpdateProjectResponse.parse(project));
});

router.delete("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [project] = await db.delete(projectsTable)
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, userId)))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
