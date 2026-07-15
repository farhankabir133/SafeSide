import { Router } from "express";
import { getWeather } from "../controllers/weatherController";

const router = Router();

router.get("/:city", getWeather);

export default router;
