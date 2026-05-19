import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, roadmapsTable, milestonesTable, tasksTable, activityTable, userSkillsTable } from "@workspace/db";
import {
  GenerateRoadmapBody,
  GetRoadmapParams,
  GetRoadmapResponse,
  ListRoadmapsResponse,
  ToggleTaskParams,
  ToggleTaskResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function getUserId(clerkId: string): Promise<number | null> {
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user?.id ?? null;
}

const ROADMAP_TEMPLATES: Record<string, { milestones: { title: string; description: string; estimatedDuration: string; industryRelevance: string; tasks: string[] }[] }> = {
  python: {
    milestones: [
      { title: "Python Fundamentals", description: "Core language features and syntax", estimatedDuration: "2 weeks", industryRelevance: "Essential for all Python roles", tasks: ["Variables, data types, and operators", "Control flow (if/else, loops)", "Functions and modules", "OOP basics (classes, inheritance)", "File handling and I/O"] },
      { title: "Data Processing", description: "Working with data libraries", estimatedDuration: "3 weeks", industryRelevance: "Critical for data roles", tasks: ["NumPy arrays and operations", "Pandas DataFrames", "Data cleaning techniques", "CSV/JSON processing", "Basic data visualization with Matplotlib"] },
      { title: "Web Development", description: "Building APIs and web services", estimatedDuration: "3 weeks", industryRelevance: "High demand for backend roles", tasks: ["Flask/FastAPI basics", "REST API design", "Database integration (SQLAlchemy)", "Authentication and middleware", "API documentation"] },
      { title: "Industry Project", description: "Production-ready project", estimatedDuration: "4 weeks", industryRelevance: "Portfolio differentiator", tasks: ["Project planning and architecture", "Testing with pytest", "Docker containerization", "CI/CD pipeline setup", "Deployment to cloud"] },
    ],
  },
  react: {
    milestones: [
      { title: "React Fundamentals", description: "Core React concepts", estimatedDuration: "2 weeks", industryRelevance: "Foundation for frontend roles", tasks: ["JSX and components", "Props and state", "Event handling", "Conditional rendering", "Lists and keys"] },
      { title: "Advanced React", description: "Complex state and patterns", estimatedDuration: "3 weeks", industryRelevance: "Required for mid-level roles", tasks: ["React hooks (useState, useEffect, useRef)", "Context API", "Custom hooks", "React Router", "Form handling"] },
      { title: "State Management & APIs", description: "External data and state", estimatedDuration: "2 weeks", industryRelevance: "Critical for production apps", tasks: ["TanStack Query", "REST API integration", "Loading and error states", "Caching strategies", "Optimistic updates"] },
      { title: "Production React", description: "Ship-ready applications", estimatedDuration: "3 weeks", industryRelevance: "Distinguishes senior candidates", tasks: ["TypeScript with React", "Testing (Vitest, Testing Library)", "Performance optimization", "Accessibility (a11y)", "Deployment and CI/CD"] },
    ],
  },
  javascript: {
    milestones: [
      { title: "JavaScript Basics", description: "Core language fundamentals", estimatedDuration: "2 weeks", industryRelevance: "Essential for all web roles", tasks: ["Variables, types, and operators", "Functions and scope", "Arrays and objects", "DOM manipulation", "Event listeners"] },
      { title: "Modern JavaScript", description: "ES6+ features", estimatedDuration: "2 weeks", industryRelevance: "Expected in all modern codebases", tasks: ["Arrow functions and destructuring", "Promises and async/await", "Modules (import/export)", "Template literals and spread operator", "Map, Set, and iterators"] },
      { title: "Node.js Backend", description: "Server-side JavaScript", estimatedDuration: "3 weeks", industryRelevance: "Full-stack capability", tasks: ["Node.js fundamentals", "Express.js framework", "REST API development", "Database integration", "Error handling and middleware"] },
      { title: "Full Stack Project", description: "End-to-end application", estimatedDuration: "4 weeks", industryRelevance: "Complete project experience", tasks: ["Full-stack architecture design", "Authentication system", "Testing suite", "Deployment strategy", "Documentation"] },
    ],
  },
};

function getDefaultTemplate(tech: string) {
  return {
    milestones: [
      { title: `${tech} Fundamentals`, description: `Core ${tech} concepts and basics`, estimatedDuration: "2 weeks", industryRelevance: "Foundation level", tasks: [`${tech} syntax and basics`, "Core concepts", "Basic patterns", "Simple exercises", "Documentation reading"] },
      { title: `Intermediate ${tech}`, description: `Advanced concepts and patterns`, estimatedDuration: "3 weeks", industryRelevance: "Professional level", tasks: ["Advanced features", "Design patterns", "Best practices", "Code organization", "Debugging techniques"] },
      { title: `${tech} Projects`, description: `Hands-on project work`, estimatedDuration: "3 weeks", industryRelevance: "Portfolio building", tasks: ["Small project", "API integration", "Testing basics", "Code review practice", "Documentation"] },
      { title: `Production ${tech}`, description: `Industry-ready skills`, estimatedDuration: "4 weeks", industryRelevance: "Job-ready", tasks: ["Industry project", "CI/CD setup", "Deployment", "Performance optimization", "Portfolio presentation"] },
    ],
  };
}

router.get("/roadmaps", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json([]);
    return;
  }

  const roadmaps = await db.select().from(roadmapsTable).where(eq(roadmapsTable.userId, userId));

  const result = await Promise.all(roadmaps.map(async (rm) => {
    const milestones = await db.select().from(milestonesTable).where(eq(milestonesTable.roadmapId, rm.id));
    let totalTasks = 0;
    let completedTasks = 0;
    for (const ms of milestones) {
      const tasks = await db.select().from(tasksTable).where(eq(tasksTable.milestoneId, ms.id));
      totalTasks += tasks.length;
      completedTasks += tasks.filter(t => t.completed).length;
    }

    const completedMilestones = milestones.filter(ms => ms.status === "completed").length;

    return {
      id: rm.id,
      userId: rm.userId,
      technology: rm.technology,
      totalMilestones: milestones.length,
      completedMilestones,
      progressPercent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      createdAt: rm.createdAt.toISOString(),
    };
  }));

  res.json(ListRoadmapsResponse.parse(result));
});

router.post("/roadmaps", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(400).json({ error: "Create a profile first" });
    return;
  }
  const parsed = GenerateRoadmapBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const techLower = parsed.data.technology.toLowerCase();
  const template = ROADMAP_TEMPLATES[techLower] || getDefaultTemplate(parsed.data.technology);

  const [roadmap] = await db.insert(roadmapsTable).values({
    userId,
    technology: parsed.data.technology,
  }).returning();

  for (let i = 0; i < template.milestones.length; i++) {
    const msTemplate = template.milestones[i];
    const [milestone] = await db.insert(milestonesTable).values({
      roadmapId: roadmap.id,
      title: msTemplate.title,
      description: msTemplate.description,
      orderIndex: i,
      estimatedDuration: msTemplate.estimatedDuration,
      industryRelevance: msTemplate.industryRelevance,
      status: "not_started",
    }).returning();

    for (const taskTitle of msTemplate.tasks) {
      await db.insert(tasksTable).values({
        milestoneId: milestone.id,
        title: taskTitle,
        completed: false,
      });
    }
  }

  await db.insert(activityTable).values({
    userId,
    type: "roadmap_created",
    title: `Created roadmap: ${parsed.data.technology}`,
    description: `Generated learning roadmap for ${parsed.data.technology}`,
  });

  const milestones = await db.select().from(milestonesTable).where(eq(milestonesTable.roadmapId, roadmap.id));

  const result = {
    id: roadmap.id,
    userId: roadmap.userId,
    technology: roadmap.technology,
    totalMilestones: milestones.length,
    completedMilestones: 0,
    progressPercent: 0,
    createdAt: roadmap.createdAt.toISOString(),
  };

  res.status(201).json(result);
});

router.get("/roadmaps/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetRoadmapParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [roadmap] = await db.select().from(roadmapsTable)
    .where(and(eq(roadmapsTable.id, params.data.id), eq(roadmapsTable.userId, userId)));

  if (!roadmap) {
    res.status(404).json({ error: "Roadmap not found" });
    return;
  }

  const milestones = await db.select().from(milestonesTable)
    .where(eq(milestonesTable.roadmapId, roadmap.id));

  const milestonesWithTasks = await Promise.all(milestones.map(async (ms) => {
    const tasks = await db.select().from(tasksTable).where(eq(tasksTable.milestoneId, ms.id));
    const allCompleted = tasks.length > 0 && tasks.every(t => t.completed);
    const anyCompleted = tasks.some(t => t.completed);

    let status = ms.status;
    if (allCompleted) status = "completed";
    else if (anyCompleted) status = "in_progress";

    return {
      ...ms,
      status,
      tasks,
    };
  }));

  res.json(GetRoadmapResponse.parse({
    id: roadmap.id,
    userId: roadmap.userId,
    technology: roadmap.technology,
    milestones: milestonesWithTasks,
    createdAt: roadmap.createdAt.toISOString(),
  }));
});

router.patch("/roadmaps/:roadmapId/tasks/:taskId/toggle", requireAuth, async (req, res): Promise<void> => {
  const params = ToggleTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [roadmap] = await db.select().from(roadmapsTable)
    .where(and(eq(roadmapsTable.id, params.data.roadmapId), eq(roadmapsTable.userId, userId)));

  if (!roadmap) {
    res.status(404).json({ error: "Roadmap not found" });
    return;
  }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.taskId));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const [updated] = await db.update(tasksTable)
    .set({ completed: !task.completed })
    .where(eq(tasksTable.id, task.id))
    .returning();

  if (!task.completed) {
    await db.insert(activityTable).values({
      userId,
      type: "task_completed",
      title: `Completed task: ${task.title}`,
      description: `Task in ${roadmap.technology} roadmap`,
    });
  }

  // ─── Sync Skill Proficiency based on Roadmap Completion ──────────────────
  try {
    const milestones = await db.select().from(milestonesTable)
      .where(eq(milestonesTable.roadmapId, roadmap.id));

    let totalTasks = 0;
    let completedTasks = 0;
    for (const ms of milestones) {
      const tasks = await db.select().from(tasksTable).where(eq(tasksTable.milestoneId, ms.id));
      totalTasks += tasks.length;
      completedTasks += tasks.filter(t => t.completed).length;
    }

    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    let skillLevel: "beginner" | "intermediate" | "advanced" | "expert" | null = null;
    if (progressPercent === 100) {
      skillLevel = "expert";
    } else if (progressPercent >= 70) {
      skillLevel = "advanced";
    } else if (progressPercent >= 40) {
      skillLevel = "intermediate";
    } else if (progressPercent >= 15) {
      skillLevel = "beginner";
    }

    const existingSkills = await db.select().from(userSkillsTable)
      .where(eq(userSkillsTable.userId, userId));
    
    const techSkillName = roadmap.technology.trim();
    const existingSkill = existingSkills.find(s => s.name.toLowerCase() === techSkillName.toLowerCase());

    if (skillLevel) {
      if (existingSkill) {
        if (existingSkill.proficiencyLevel !== skillLevel) {
          await db.update(userSkillsTable)
            .set({ proficiencyLevel: skillLevel })
            .where(eq(userSkillsTable.id, existingSkill.id));

          await db.insert(activityTable).values({
            userId,
            type: "project_updated",
            title: `Updated skill level: ${techSkillName}`,
            description: `Level bumped to ${skillLevel} (${progressPercent}% roadmap completion)`,
          });
        }
      } else {
        await db.insert(userSkillsTable).values({
          userId,
          name: techSkillName,
          proficiencyLevel: skillLevel,
        });

        await db.insert(activityTable).values({
          userId,
          type: "project_updated",
          title: `Added skill: ${techSkillName}`,
          description: `Added as ${skillLevel} due to roadmap progress (${progressPercent}%)`,
        });
      }
    } else {
      if (existingSkill) {
        await db.delete(userSkillsTable).where(eq(userSkillsTable.id, existingSkill.id));
      }
    }
  } catch (syncErr) {
    console.error("Error syncing roadmap completion to user skills:", syncErr);
  }

  res.json(ToggleTaskResponse.parse(updated));
});

router.delete("/roadmaps/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = await getUserId((req as any).clerkUserId);
    if (!userId) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid roadmap ID" });
      return;
    }

    const [deleted] = await db.delete(roadmapsTable)
      .where(and(eq(roadmapsTable.id, id), eq(roadmapsTable.userId, userId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Roadmap not found" });
      return;
    }

    // ─── Delete Synced User Skill ───────────────────────────────────────────
    const techSkillName = deleted.technology.trim();
    await db.delete(userSkillsTable)
      .where(and(
        eq(userSkillsTable.userId, userId),
        eq(userSkillsTable.name, techSkillName)
      ));

    await db.insert(activityTable).values({
      userId,
      type: "project_updated",
      title: `Deleted roadmap: ${deleted.technology}`,
      description: `Removed learning roadmap for ${deleted.technology}`,
    });

    res.sendStatus(204);
  } catch (err) {
    console.error("Error deleting roadmap:", err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
