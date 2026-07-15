import serverless from "serverless-http";
import { createApp } from "../server/app";

const app = createApp();

// Vercel serverless handler: Express app wrapped for the Node.js runtime.
// Serves /api/* routes and the built SPA (from dist/) from a single function.
export const handler = serverless(app);

// Give long-running AI / odds calls enough time (max allowed on Hobby is 60s).
export const config = { maxDuration: 60 };
