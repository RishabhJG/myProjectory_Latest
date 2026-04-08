import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { CreateProfileBody, UpdateProfileBody, GetProfileResponse, UpdateProfileResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/profile", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(GetProfileResponse.parse(user));
});

router.post("/profile", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const parsed = CreateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (existing.length > 0) {
    res.status(409).json({ error: "Profile already exists" });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    ...parsed.data,
    clerkId,
  }).returning();

  res.status(201).json(GetProfileResponse.parse(user));
});

router.patch("/profile", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.clerkId, clerkId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json(UpdateProfileResponse.parse(user));
});

export default router;
