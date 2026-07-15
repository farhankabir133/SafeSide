import { Request, Response, NextFunction } from "express";

interface Timing {
  start: number;
  end?: number;
  durationMs?: number;
}

export function performanceMonitor(req: Request, res: Response, next: NextFunction) {
  req.startTime = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - req.startTime!;
    const log: any = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs,
      requestId: req.id,
      userAgent: req.get("user-agent"),
    };

    if (durationMs > 1000) {
      console.warn(`[SafeSide Slow Request] ${req.method} ${req.originalUrl} ${durationMs}ms`);
    }

    console.log(JSON.stringify(log));
  });

  next();
}
