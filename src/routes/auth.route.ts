import { Router } from "express";
import { asyncHandler } from "@/utils";
import type { createContainer } from "@/container";

export const authRouter = (container: ReturnType<typeof createContainer>) => {
  const router: Router = Router();

  const { controllerContainer, middlewareContainer } = container;
  const { authController } = controllerContainer;
  const { authMiddleware } = middlewareContainer;

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
      authMiddleware,
      asyncHandler(authController.resendSignupCodeHandler.bind(authController))
    );

  router
    .route("/verify/signup/code")
    .post(
      authMiddleware,
      asyncHandler(authController.verifySignupCodeHandler.bind(authController))
    );

  router
    .route("/me")
    .get(
      authMiddleware,
      asyncHandler(
        authController.authUserBasicDataProvider.bind(authController)
      )
    );

  return router;
};
