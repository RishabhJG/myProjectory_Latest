import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import projectsRouter from "./projects";
import scoresRouter from "./scores";
import roadmapsRouter from "./roadmaps";
import jobsRouter from "./jobs";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(projectsRouter);
router.use(scoresRouter);
router.use(roadmapsRouter);
router.use(jobsRouter);
router.use(dashboardRouter);

export default router;
