import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { 
  db, 
  domainsTable, 
  domainCategoriesTable, 
  domainRoleMapTable, 
  domainSkillMapTable 
} from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAuth";
import { GetDomainResponse, CreateDomainBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/domains", async (req, res): Promise<void> => {
  const allDomains = await db.select().from(domainsTable);
  
  if (allDomains.length === 0) {
    res.json([]);
    return;
  }
  
  const domainIds = allDomains.map(d => d.id);
  
  const categories = await db.select().from(domainCategoriesTable).where(inArray(domainCategoriesTable.domainId, domainIds));
  const roles = await db.select().from(domainRoleMapTable).where(inArray(domainRoleMapTable.domainId, domainIds));
  const skills = await db.select().from(domainSkillMapTable).where(inArray(domainSkillMapTable.domainId, domainIds));

  const finalDomains = allDomains.map(d => ({
    ...d,
    categories: categories.filter(c => c.domainId === d.id).map(c => c.name),
    roles: roles.filter(r => r.domainId === d.id).map(r => r.role),
    skills: skills.filter(s => s.domainId === d.id).map(s => s.skill),
  }));

  res.json(finalDomains);
});

router.get("/domains/:id", async (req, res): Promise<void> => {
  const domainId = parseInt(req.params.id);
  if (isNaN(domainId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [domain] = await db.select().from(domainsTable).where(eq(domainsTable.id, domainId));
  if (!domain) {
    res.status(404).json({ error: "Domain not found" });
    return;
  }

  const categories = await db.select().from(domainCategoriesTable).where(eq(domainCategoriesTable.domainId, domainId));
  const roles = await db.select().from(domainRoleMapTable).where(eq(domainRoleMapTable.domainId, domainId));
  const skills = await db.select().from(domainSkillMapTable).where(eq(domainSkillMapTable.domainId, domainId));

  res.json(GetDomainResponse.parse({
    ...domain,
    categories: categories.map(c => c.name),
    roles: roles.map(r => r.role),
    skills: skills.map(s => s.skill),
  }));
});

router.post("/domains", requireAdmin, async (req, res): Promise<void> => {
  const body = CreateDomainBody.parse(req.body);
  
  const [newDomain] = await db.insert(domainsTable).values({
    name: body.name,
    description: body.description,
    priority: body.priority,
    isVisible: body.isVisible,
  }).returning();

  if (body.categories && body.categories.length > 0) {
    await db.insert(domainCategoriesTable).values(
      body.categories.map(name => ({ domainId: newDomain.id, name }))
    );
  }
  
  if (body.roles && body.roles.length > 0) {
    await db.insert(domainRoleMapTable).values(
      body.roles.map(role => ({ domainId: newDomain.id, role }))
    );
  }

  if (body.skills && body.skills.length > 0) {
    await db.insert(domainSkillMapTable).values(
      body.skills.map(skill => ({ domainId: newDomain.id, skill }))
    );
  }

  const domainResponse = {
    ...newDomain,
    categories: body.categories || [],
    roles: body.roles || [],
    skills: body.skills || [],
  };

  res.status(201).json(GetDomainResponse.parse(domainResponse));
});

router.patch("/domains/:id", requireAdmin, async (req, res): Promise<void> => {
  const domainId = parseInt(req.params.id);
  const body = CreateDomainBody.parse(req.body);

  const [updatedDomain] = await db.update(domainsTable)
    .set({
      name: body.name,
      description: body.description,
      priority: body.priority,
      isVisible: body.isVisible,
    })
    .where(eq(domainsTable.id, domainId))
    .returning();

  if (!updatedDomain) {
    res.status(404).json({ error: "Domain not found" });
    return;
  }

  // Wipe and rebuild relations
  await db.delete(domainCategoriesTable).where(eq(domainCategoriesTable.domainId, domainId));
  await db.delete(domainRoleMapTable).where(eq(domainRoleMapTable.domainId, domainId));
  await db.delete(domainSkillMapTable).where(eq(domainSkillMapTable.domainId, domainId));

  if (body.categories && body.categories.length > 0) {
    await db.insert(domainCategoriesTable).values(
      body.categories.map(name => ({ domainId: domainId, name }))
    );
  }
  
  if (body.roles && body.roles.length > 0) {
    await db.insert(domainRoleMapTable).values(
      body.roles.map(role => ({ domainId: domainId, role }))
    );
  }

  if (body.skills && body.skills.length > 0) {
    await db.insert(domainSkillMapTable).values(
      body.skills.map(skill => ({ domainId: domainId, skill }))
    );
  }

  const domainResponse = {
    ...updatedDomain,
    categories: body.categories || [],
    roles: body.roles || [],
    skills: body.skills || [],
  };

  res.json(GetDomainResponse.parse(domainResponse));
});

router.delete("/domains/:id", requireAdmin, async (req, res): Promise<void> => {
  const domainId = parseInt(req.params.id);
  
  // No need to manually wipe child relations since onDelete is set to cascade!
  await db.delete(domainsTable).where(eq(domainsTable.id, domainId));
  
  res.status(204).send();
});

export default router;
