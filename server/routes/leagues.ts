import { Router } from "express";
import { getLeagueStandings, getLeagueScorers } from "../controllers/leagueController";

const router = Router();

router.get("/:id/standings", getLeagueStandings);
router.get("/:id/scorers", getLeagueScorers);

export default router;
