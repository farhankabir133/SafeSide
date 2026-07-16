import express from "express";
import path from "path";
import "dotenv/config";
import registerRoutes from "./routes/index";
import { notFound, errorHandler } from "./middleware/errorHandler";
import { corsMiddleware } from "./middleware/cors";
import { requestId } from "./middleware/requestId";
import { performanceMonitor } from "./middleware/performance";

/**
 * Builds the SafeSide Express app: API routes + static SPA hosting.
 * Used by the Vercel serverless function (api/index.ts) and, in production
 * mode, by the local entrypoint so behavior is identical in both places.
 */
export function createApp() {
  const app = express();

  app.use(corsMiddleware);
  app.use(requestId);
  app.use(performanceMonitor);
  app.use(express.json());

  registerRoutes(app);

  // Serve the Vite production build (client) and SPA-fallback every route to
  // index.html so client-side routing works on deep links.
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
