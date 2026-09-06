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

const server = new ExpressServer();
const app = server.GetApp();

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
app.use(limiter);

/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */
app.use("/api", routers);
app.use("/health", async (_, res) => {
  return res.status(200).json(new ApiResponse(200, "OK"));
});

/* -------------------------------------------------------------------------- */
/*                          Error Handler Middleware                          */
/* -------------------------------------------------------------------------- */
app.use(errorHandlerMiddleware);

// Start Server
app.listen(baseConfig.PORT, async () => {
  console.log(await redisClient.ping());
  console.log(`Server is listening on port: ${baseConfig.PORT}`);
});
