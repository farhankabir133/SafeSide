import { createApp } from "../server/app";

const app = createApp();

export const config = { maxDuration: 60 };

/**
 * Vercel Node.js runtime invokes the default export with (req, res) — the same
 * shape an Express app consumes directly. This serves /api/* routes and the
 * built SPA (from dist/) from a single serverless function.
 */
export default function handler(
  req: import("http").IncomingMessage,
  res: import("http").ServerResponse,
) {
  return app(req, res);
}
