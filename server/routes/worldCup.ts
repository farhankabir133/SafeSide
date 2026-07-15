import { Router } from "express";
import { getWorldCupFixtures } from "../controllers/worldCupController";

const router = Router();

router.get("/", getWorldCupFixtures);

export default router;
