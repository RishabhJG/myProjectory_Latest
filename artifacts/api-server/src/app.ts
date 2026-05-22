import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { initializeJobsSync } from "./services/jobsSync";

const FRONTEND_PORT = process.env.FRONTEND_PORT ?? "5173";
 
const app: Express = express();

// initializeJobsSync();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Skip Clerk middleware entirely when auth bypass is enabled (no valid keys needed)
if (!(process.env.NODE_ENV === "development" && process.env.SKIP_ADMIN_CHECK === "true")) {
  app.use(clerkMiddleware());
}

app.use("/api", router);

if (process.env.NODE_ENV === "development") {
  app.use(
    "/",
    createProxyMiddleware({
      target: `http://127.0.0.1:${FRONTEND_PORT}`,
      changeOrigin: true,
      ws: true,
    }),
  );
}

export default app;
