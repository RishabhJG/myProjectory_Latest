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

  // MySQL doesn't support .returning() — insert then select
  await db.insert(usersTable).values({
    ...parsed.data,
    clerkId,
  });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));

  res.status(201).json(GetProfileResponse.parse(user));
});

router.patch("/profile", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = await db.update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.clerkId, clerkId));

  // affectedRows === 0 means the user didn't exist
  if ((result[0] as any).affectedRows === 0) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  // MySQL doesn't support .returning() — fetch the updated row
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));

  res.json(UpdateProfileResponse.parse(user));
});

export default router;
