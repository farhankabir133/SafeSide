import { Router, Request, Response } from "express";
import { streamLiveMatch, ingestWebhook } from "../controllers/liveController";

const router = Router();

router.get("/live-stream", streamLiveMatch);
router.post("/football-signals", ingestWebhook);

export default router;
