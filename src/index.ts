// ┌─────────────────────────┐
// │ Base Imports            │
// └─────────────────────────┘
import routers from "./routes/index.route";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { ApiResponse, connectRedis, redisClient } from "./libs";
import { errorHandlerMiddleware, requestLogger } from "./middlewares";
import { baseConfig } from "./config";
import { ExpressServer } from "./server";
import { pgDb } from "./libs/db.connect";
import { sql } from "drizzle-orm";
import promClient from "@prometheus-io/client";

/* -------------------------------------------------------------------------- */
/*                                 Metrics                                    */
/* -------------------------------------------------------------------------- */
const collectDefaultMetrics = promClient.collectDefaultMetrics;
const Registry = promClient.Registry;
const register = new Registry();
collectDefaultMetrics({ register });

// Custom Metrics
const reqResTime = new promClient.Histogram({
  name: "http_request_duration_second",
  help: "HTTP request duration in second",
  labelNames: ["method", "route", "status"],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const reqCounter = new promClient.Counter({
  name: "req_counter",
  help: "Counts total http requests",
  labelNames: ["method", "route", "code"],
});

/* -------------------------------------------------------------------------- */
/*                               Create Server                                */
/* -------------------------------------------------------------------------- */
const server = new ExpressServer();
const app = server.GetApp();

if (process.env.NODE_ENV === "development") {
  app.use(requestLogger());
}

/* -------------------------------------------------------------------------- */
/*                            Metrics Middlewares                             */
/* -------------------------------------------------------------------------- */

app.use((req, res, next) => {
  if (req.path.startsWith("/metrics")) return next();
  const end = reqResTime.startTimer();
  res.on("finish", () => {
    reqCounter.inc({
      code: res.statusCode,
      method: req.method,
      route: req.path,
    });
    end({ method: req.method, route: req.path, status: res.statusCode });
  });

  next();
});

/* -------------------------------------------------------------------------- */
/*                                 Rate Limiter                               */
/* -------------------------------------------------------------------------- */
await connectRedis();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56,
  passOnStoreError: false,
  skip: () => baseConfig.NODE_ENV === "test",
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
});
app.use(limiter);

/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */
app.use("/api", routers);
app.use("/health", async (_, res) => {
  return res.status(200).json(new ApiResponse(200, "OK"));
});

app.use("/system/connections", async (_, res) => {
  const result = await pgDb.execute(sql`select now()`);
  return res.status(200).json(
    new ApiResponse(200, "OK", {
      database: result.rows[0]!.now,
      redis: await redisClient.ping(),
    })
  );
});

app.get("/metrics", async (_req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

/* -------------------------------------------------------------------------- */
/*                          Error Handler Middleware                          */
/* -------------------------------------------------------------------------- */
app.use(errorHandlerMiddleware);

// Start Server
app.listen(baseConfig.PORT, async () => {
  console.log(`Server is listening on port: ${baseConfig.PORT}`);
});
