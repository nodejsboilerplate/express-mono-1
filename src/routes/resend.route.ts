import { Router } from "express";
import { asyncHandler } from "@/utils";
import type { createContainer } from "@/container";

export const resendRouter = (container: ReturnType<typeof createContainer>) => {
  const router: Router = Router();

  const { controllerContainer } = container;
  const { resendController } = controllerContainer;

  // Configure the webhook in your Resend dashboard:
  // https://resend.com/webhooks
  router
    .route("/webhook")
    .post(asyncHandler(resendController.webhook.bind(resendController)));

  return router;
};
