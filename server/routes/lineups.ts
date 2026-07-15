import { Router } from "express";
import { getMatchLineups } from "../controllers/lineupsController";

const router = Router();
router.get("/:id/lineups", getMatchLineups);

export default router;
