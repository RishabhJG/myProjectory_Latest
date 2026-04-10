import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import projectsRouter from "./projects";
import scoresRouter from "./scores";
import roadmapsRouter from "./roadmaps";
import jobsRouter from "./jobs";
import dashboardRouter from "./dashboard";
import domainsRouter from "./domains";
import portfolioRouter from "./portfolio";
import analysisRouter from "./analysis";
import stacksRouter from "./stacks";
import jobListingsRouter from "./job-listings";
import jobIntelligenceRouter from "./job-intelligence";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(projectsRouter);
router.use(scoresRouter);
router.use(roadmapsRouter);
router.use(jobsRouter);
router.use(jobListingsRouter);
router.use(jobIntelligenceRouter);
router.use(dashboardRouter);
router.use(domainsRouter);
router.use(portfolioRouter);
router.use(analysisRouter);
router.use(stacksRouter);

export default router;
