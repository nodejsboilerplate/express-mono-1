import { Router } from "express";
import { asyncHandler } from "@/utils";
import { AuthController } from "@/controllers/auth.controller";
import { authMiddlware } from "@/middlewares/auth.middleware";

const router: Router = Router();
const authController = new AuthController();

router
  .route("/signup")
  .post(asyncHandler(authController.signupUserHandler.bind(authController)));

router
  .route("/login")
  .post(asyncHandler(authController.loginUserHandler.bind(authController)));

router
  .route("/signin/google")
  .get(
    asyncHandler(authController.redirectGoogleAuthHandler.bind(authController))
  );
router
  .route("/callback/google")
  .get(
    asyncHandler(authController.loginWithGoogleHandler.bind(authController))
  );

router
  .route("/resend-signup-code")
  .post(
    authMiddlware,
    asyncHandler(authController.resendSignupCodeHandler.bind(authController))
  );

router
  .route("/verify-signup-code")
  .post(
    authMiddlware,
    asyncHandler(authController.verifySignupCodeHandler.bind(authController))
  );

export default router;
