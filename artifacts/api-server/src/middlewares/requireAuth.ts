import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Development bypass for easy local testing without Clerk
  if (process.env.NODE_ENV === "development" && process.env.SKIP_ADMIN_CHECK === "true") {
    (req as any).clerkUserId = "dev_user_id";
    next();
    return;
  }

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
  // Development bypass for easy local testing without setting up Clerk roles
  if (process.env.NODE_ENV === "development" && process.env.SKIP_ADMIN_CHECK === "true") {
    (req as any).clerkUserId = "mock_admin_id";
    next();
    return;
  }

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

