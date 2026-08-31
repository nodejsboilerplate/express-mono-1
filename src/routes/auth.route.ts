import { Router } from "express";
import { asyncHandler } from "@/utils";
import { AuthController } from "@/controllers/auth.controller";

const router: Router = Router();
const authController = new AuthController;

router
  .route("/login")
  .post(asyncHandler(authController.loginUserHandler.bind(authController)));

router
  .route("/:id/send-signup-code")
  .post(
    asyncHandler(authController.sendSignupCodeHandler.bind(authController))
  );

router
  .route("/:id/verify-signup-code")
  .post(
    asyncHandler(authController.verifySignupCodeHandler.bind(authController))
  );

export default router;
