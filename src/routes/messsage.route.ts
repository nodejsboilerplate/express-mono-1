import type { ContainerType } from "@/types";
import { asyncHandler } from "@/utils";
import { Router } from "express";

export const messageRouter = (container: ContainerType) => {
  const router: Router = Router();

  const { controllerContainer, middlewareContainer } = container;
  const { messegeController } = controllerContainer;
  const { authMiddleware } = middlewareContainer;

  router
    .route("/signup/code")
    .post(
      authMiddleware,
      asyncHandler(
        messegeController.resendSignupCodeHandler.bind(messegeController)
      )
    );

  router
    .route("/verify/signup/code")
    .post(
      authMiddleware,
      asyncHandler(
        messegeController.verifySignupCodeHandler.bind(messegeController)
      )
    );

  router
    .route("/contacts/phones/:id/code")
    .post(
      authMiddleware,
      asyncHandler(
        messegeController.sendContactPhoneVerificationHandler.bind(
          messegeController
        )
      )
    );

  router
    .route("/contacts/emails/:id/code")
    .post(
      authMiddleware,
      asyncHandler(
        messegeController.sendContactEmailVerificationHandler.bind(
          messegeController
        )
      )
    );

  router
    .route("/verify/contacts/phones/:id")
    .post(
      authMiddleware,
      asyncHandler(
        messegeController.verifyContactPhoneHandler.bind(messegeController)
      )
    );

  router
    .route("/verify/contacts/emails/:id")
    .post(
      authMiddleware,
      asyncHandler(
        messegeController.verifyContactEmailHandler.bind(messegeController)
      )
    );

  return router;
};
