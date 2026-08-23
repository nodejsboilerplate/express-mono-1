import { Router } from "express";
import { UserController } from "@/controllers/user.controller";
import { asyncHandler } from "@/utils";

const router: Router = Router();
const userController = new UserController();

// ---------------------------------------------------------
// Create
// ---------------------------------------------------------
router
  .route("/")
  .post(asyncHandler(userController.createUser.bind(userController)));

router
  .route("/:userId/address")
  .post(asyncHandler(userController.createAddress.bind(userController)));

  router
  .route("/:userId/contact")
  .post(asyncHandler(userController.createContact.bind(userController)));

router
  .route("/:userId/contact/:contactId/phone")
  .post(asyncHandler(userController.createPhone.bind(userController)));

router
  .route("/:userId/contact/:contactId/email")
  .post(asyncHandler(userController.createEmail.bind(userController)));

// ---------------------------------------------------------
// Verify
// ---------------------------------------------------------
router
  .route("/verify")
  .post(asyncHandler(userController.verifyUser.bind(userController)));

router
  .route("/:userId/phone/:id/verify")
  .post(asyncHandler(userController.verifyContactPhone.bind(userController)));

router
  .route("/:userId/email/:id/verify")
  .post(asyncHandler(userController.verifyContactEmail.bind(userController)));

// ---------------------------------------------------------
// Update
// ---------------------------------------------------------
router
  .route("/:userId/profile")
  .patch(asyncHandler(userController.updateProfile.bind(userController)));

router
  .route("/:userId/address/:id")
  .patch(asyncHandler(userController.updateAddress.bind(userController)));

router
  .route("/:userId/contact")
  .patch(asyncHandler(userController.updateContact.bind(userController)));

router
  .route("/:userId/phone/:id")
  .patch(asyncHandler(userController.updatePhone.bind(userController)));

router
  .route("/:userId/email/:id")
  .patch(asyncHandler(userController.updateEmail.bind(userController)));

// ---------------------------------------------------------
// Delete
// ---------------------------------------------------------
router
  .route("/:userId")
  .delete(asyncHandler(userController.deleteProfile.bind(userController)));

router
  .route("/:userId/address/:id")
  .delete(asyncHandler(userController.deleteAddress.bind(userController)));

router
  .route("/:userId/contact/:id")
  .delete(asyncHandler(userController.deleteContact.bind(userController)));

router
  .route("/:userId/phone/:id")
  .delete(asyncHandler(userController.deletePhone.bind(userController)));

router
  .route("/:userId/email/:id")
  .delete(asyncHandler(userController.deleteEmail.bind(userController)));

export default router;
