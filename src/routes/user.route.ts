import { Router } from "express";
import { asyncHandler } from "@/utils";
import type { ContainerType } from "@/types";

export const userRouter = (container: ContainerType) => {
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
