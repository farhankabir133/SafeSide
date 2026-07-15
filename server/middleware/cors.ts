import { Request, Response, NextFunction } from "express";

const corsOrigins = process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173", "http://localhost:3000"];

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  
  if (origin && corsOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, X-Auth-Token, Authorization");
  res.header("Access-Control-Expose-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  
  next();
}
