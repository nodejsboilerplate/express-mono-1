import { Router } from "express";
import { ResendController } from "@/controllers/resend.controller";
import { asyncHandler } from "@/utils";

const router: Router = Router();
const resendController = new ResendController();

// Configure the webhook in your Resend dashboard:
// https://resend.com/webhooks
router
  .route("/webhook")
  .post(asyncHandler(resendController.webhook.bind(resendController)));

export default router;
