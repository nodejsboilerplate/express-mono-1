import { Router } from "express";
import { asyncHandler } from "@/utils";
import { authMiddlware } from "@/middlewares/auth.middleware";
import type { createContainer } from "@/container";

export const authRouter = (container: ReturnType<typeof createContainer>) => {
  const router: Router = Router();

  const { controllerContainer } = container;
  const { authController } = controllerContainer;

  router
    .route("/signup")
    .post(asyncHandler(authController.signupUserHandler.bind(authController)));

  router
    .route("/login")
    .post(asyncHandler(authController.loginUserHandler.bind(authController)));

  router
    .route("/signin/google")
    .get(
      asyncHandler(
        authController.redirectGoogleAuthHandler.bind(authController)
      )
    );
  router
    .route("/callback/google")
    .get(
      asyncHandler(authController.loginWithGoogleHandler.bind(authController))
    );

  router
    .route("/messages/signup/code")
    .post(
      authMiddlware,
      asyncHandler(authController.resendSignupCodeHandler.bind(authController))
    );

  router
    .route("/verify/signup/code")
    .post(
      authMiddlware,
      asyncHandler(authController.verifySignupCodeHandler.bind(authController))
    );

  router
    .route("/me")
    .get(
      authMiddlware,
      asyncHandler(
        authController.authUserBasicDataProvider.bind(authController)
      )
    );

  return router;
};
