import { Router, type IRouter } from "express";
import healthRouter from "./health";
import swarmRouter from "./swarm";
import authRouter from "./auth";
import agentsRouter from "./agents";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(agentsRouter);
router.use(aiRouter);
router.use(swarmRouter);

export default router;
