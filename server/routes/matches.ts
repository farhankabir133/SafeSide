import { Router } from "express";
import { getMatches, getMatchDetail, getMatchHeadToHead } from "../controllers/matchController";

const router = Router();

router.get("/", getMatches);
router.get("/:id", getMatchDetail);
router.get("/:id/head2head", getMatchHeadToHead);

export default router;
