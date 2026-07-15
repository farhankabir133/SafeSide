import { Router } from "express";
import { analyzeMatch } from "../controllers/analyzeController";

const router = Router();

router.post("/", analyzeMatch);

export default router;
