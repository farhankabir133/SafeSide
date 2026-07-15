import { Router } from "express";
import { getTeamDetail, getTeamMatches } from "../controllers/teamController";

const router = Router();

router.get("/:id", getTeamDetail);
router.get("/:id/matches", getTeamMatches);

export default router;
