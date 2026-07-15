import { Router } from "express";
import { getAdminMetrics } from "../controllers/adminController";

const router = Router();

router.get("/metrics", getAdminMetrics);

export default router;
