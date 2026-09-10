import { Router } from "express";
import { asyncHandler } from "@/utils";
import type { ContainerType } from "@/types";

export const authRouter = (container: ContainerType) => {
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
    .route("/me")
    .get(
      authMiddleware,
      asyncHandler(
        authController.authUserBasicDataProvider.bind(authController)
      )
    );

  return router;
};
