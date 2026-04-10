import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).clerkUserId = userId;
  next();
};

import { clerkClient } from "@clerk/express";

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  
  try {
    const user = await clerkClient.users.getUser(userId);
    const role = user.publicMetadata?.role;
    
    if (role !== "admin") {
      res.status(403).json({ error: "Forbidden: Admin access required" });
      return;
    }
    
    (req as any).clerkUserId = userId;
    next();
  } catch (error) {
    res.status(500).json({ error: "Error verifying admin status" });
  }
};

