import type { createContainer } from "@/container";
import { authRouter } from "./auth.route";
import { userRouter } from "./user.route";
import { resendRouter } from "./resend.route";
import { Router } from "express";

export const apiRouters = (container: ReturnType<typeof createContainer>) => {
  const router: Router = Router();

  authRouter(container);
  userRouter(container);
  resendRouter(container);

  router.use("/v1/users", userRouter(container));
  router.use("/v1/auth", authRouter(container));
  router.use("/v1/resend", resendRouter);

  return router;
};
