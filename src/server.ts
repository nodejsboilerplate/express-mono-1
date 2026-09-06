// ┌─────────────────────────┐
// │ Base Imports            │
// └─────────────────────────┘
import express from "express";
import type { Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import routers from "./routes/index.route";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import requestIp from "request-ip";
import { ApiResponse, redisClient, connectRedis } from "./libs";
import { errorHandlerMiddleware, requestLogger } from "./middlewares";
import { baseConfig } from "./config";

const app: Express = express();

/* -------------------------------------------------------------------------- */
/*                                Base Setup                                  */
/* -------------------------------------------------------------------------- */
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ extended: true, limit: "500kb" }));
app.use(cookieParser());
app.use(requestIp.mw());

// dont run logger in production for aws lambda
if (process.env.NODE_ENV === "development") {
  app.use(requestLogger());
}

/* -------------------------------------------------------------------------- */
/*                                 Rate Limiter                               */
/* -------------------------------------------------------------------------- */
await connectRedis();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: baseConfig.NODE_ENV == "test" ? 5000 : 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56,
  passOnStoreError: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
});

app.set("trust proxy", true);
app.use(limiter);

/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */
app.use("/api", routers);

app.get("/health", async (_, res) => {
  res.status(200).json(new ApiResponse(200, "OK"));
});

/* -------------------------------------------------------------------------- */
/*                          Error Handler Middleware                          */
/* -------------------------------------------------------------------------- */
app.use(errorHandlerMiddleware);

export { app };
