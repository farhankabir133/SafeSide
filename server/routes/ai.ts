import { Router } from "express";
import { generateContent, chatWithAssistant } from "../controllers/aiController";

const router = Router();

router.post("/generate", generateContent);
router.post("/chat", chatWithAssistant);

export default router;
