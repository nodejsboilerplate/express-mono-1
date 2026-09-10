import type { ContainerType } from "@/types";
import { asyncHandler } from "@/utils";
import { Router } from "express";

export const userRouter = (container: ContainerType) => {
  const router: Router = Router();

  const { controllerContainer, middlewareContainer } = container;
  const { messegeController } = controllerContainer;
  const { authMiddleware } = middlewareContainer;

  router
    .route("/messages/signup/code")
    .post(
      authMiddleware,
      asyncHandler(
        messegeController.resendSignupCodeHandler.bind(messegeController)
      )
    );

  router
    .route("/messages/verify/signup/code")
    .post(
      authMiddleware,
      asyncHandler(
        messegeController.verifySignupCodeHandler.bind(messegeController)
      )
    );

  router
    .route("/messages/contacts/phones/:id/code")
    .post(
      authMiddleware,
      asyncHandler(
        messegeController.sendContactPhoneVerificationHandler.bind(
          messegeController
        )
      )
    );

  router
    .route("/messages/contacts/emails/:id/code")
    .post(
      authMiddleware,
      asyncHandler(
        messegeController.sendContactEmailVerificationHandler.bind(
          messegeController
        )
      )
    );

  router
    .route("/messages/verify/contacts/phones/:id")
    .post(
      authMiddleware,
      asyncHandler(
        messegeController.verifyContactPhoneHandler.bind(messegeController)
      )
    );

  router
    .route("/messages/verify/contacts/emails/:id")
    .post(
      authMiddleware,
      asyncHandler(
        messegeController.verifyContactEmailHandler.bind(messegeController)
      )
    );
};
