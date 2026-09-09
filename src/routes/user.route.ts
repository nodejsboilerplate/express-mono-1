import { Router } from "express";
import { asyncHandler } from "@/utils";
import type { createContainer } from "@/container";

export const userRouter = (container: ReturnType<typeof createContainer>) => {
  const router: Router = Router();

  const { controllerContainer, middlewareContainer } = container;
  const { userController } = controllerContainer;
  const { authMiddleware } = middlewareContainer;

  // ---------------------------------------------------------
  // Create
  // ---------------------------------------------------------

  router
    .route("/addresses")
    .post(
      authMiddleware,
      asyncHandler(userController.createAddressHandler.bind(userController))
    );

  router
    .route("/contacts")
    .post(
      authMiddleware,
      asyncHandler(userController.createContactHandler.bind(userController))
    );

  router
    .route("/contacts/:id/phones")
    .post(
      authMiddleware,
      asyncHandler(userController.createPhoneHandler.bind(userController))
    );

  router
    .route("/contacts/:id/emails")
    .post(
      authMiddleware,
      asyncHandler(userController.createEmailHandler.bind(userController))
    );

  // ---------------------------------------------------------
  // Read
  // ---------------------------------------------------------
  router
    .route("/profile")
    .get(
      authMiddleware,
      asyncHandler(userController.getUserProfileHandler.bind(userController))
    );

  // ---------------------------------------------------------
  // Verify
  // ---------------------------------------------------------

  router
    .route("/messages/contacts/phones/:id/code")
    .post(
      authMiddleware,
      asyncHandler(
        userController.sendContactPhoneVerificationHandler.bind(userController)
      )
    );

  router
    .route("/messages/contacts/emails/:id/code")
    .post(
      authMiddleware,
      asyncHandler(
        userController.sendContactEmailVerificationHandler.bind(userController)
      )
    );

  router
    .route("/verify/contacts/phones/:id")
    .post(
      authMiddleware,
      asyncHandler(
        userController.verifyContactPhoneHandler.bind(userController)
      )
    );

  router
    .route("/verify/contacts/emails/:id")
    .post(
      authMiddleware,
      asyncHandler(
        userController.verifyContactEmailHandler.bind(userController)
      )
    );

  // ---------------------------------------------------------
  // Update
  // ---------------------------------------------------------
  router
    .route("/profile")
    .patch(
      authMiddleware,
      asyncHandler(userController.updateProfileHandler.bind(userController))
    );

  router
    .route("/addresses/:id")
    .patch(
      authMiddleware,
      asyncHandler(userController.updateAddressHandler.bind(userController))
    );

  router
    .route("/contacts")
    .patch(
      authMiddleware,
      asyncHandler(userController.updateContactHandler.bind(userController))
    );

  router
    .route("/contacts/phones/:id")
    .patch(
      authMiddleware,
      asyncHandler(userController.updatePhoneHandler.bind(userController))
    );

  router
    .route("/contacts/emails/:id")
    .patch(
      authMiddleware,
      asyncHandler(userController.updateEmailHandler.bind(userController))
    );

  // ---------------------------------------------------------
  // Delete
  // ---------------------------------------------------------
  router
    .route("/")
    .delete(
      authMiddleware,
      asyncHandler(userController.deleteUserHandler.bind(userController))
    );

  router
    .route("/addresses/:id")
    .delete(
      authMiddleware,
      asyncHandler(userController.deleteAddressHandler.bind(userController))
    );

  router
    .route("/contacts/:id")
    .delete(
      authMiddleware,
      asyncHandler(userController.deleteContactHandler.bind(userController))
    );

  router
    .route("/contacts/phones/:id")
    .delete(
      authMiddleware,
      asyncHandler(userController.deletePhoneHandler.bind(userController))
    );

  router
    .route("/contacts/emails/:id")
    .delete(
      authMiddleware,
      asyncHandler(userController.deleteEmailHandler.bind(userController))
    );

  return router;
};
