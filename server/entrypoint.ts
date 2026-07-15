import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import "dotenv/config";
import registerRoutes from "./routes";
import { notFound, errorHandler } from "./middleware/errorHandler";
import { corsMiddleware } from "./middleware/cors";
import { requestId } from "./middleware/requestId";
import { performanceMonitor } from "./middleware/performance";

const log = {
  info: (msg: string, meta?: any) => console.log(JSON.stringify({ level: "info", message: msg, ...meta })),
  warn: (msg: string, meta?: any) => console.warn(JSON.stringify({ level: "warn", message: msg, ...meta })),
  error: (msg: string, meta?: any) => console.error(JSON.stringify({ level: "error", message: msg, ...meta })),
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(corsMiddleware);
  app.use(requestId);
  app.use(performanceMonitor);
  app.use(express.json());

  registerRoutes(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  app.listen(PORT, "0.0.0.0", () => {
    log.info(`SafeSide Server running on http://localhost:${PORT}`);
  });
}

startServer();
