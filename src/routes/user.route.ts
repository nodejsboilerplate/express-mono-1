import { Router } from "express";
import { UserController } from "@/controllers/user.controller";
import { asyncHandler } from "@/utils";

const router: Router = Router();
const userController = new UserController();

// ---------------------------------------------------------
// Create
// ---------------------------------------------------------
router
  .route("/create")
  .post(asyncHandler(userController.createUser.bind(userController)));

router
  .route("/:userId/addresses")
  .post(asyncHandler(userController.createAddress.bind(userController)));

router
  .route("/:userId/contacts/:contactId/phones")
  .post(asyncHandler(userController.createPhone.bind(userController)));

router
  .route("/:userId/contacts/:contactId/emails")
  .post(asyncHandler(userController.createEmail.bind(userController)));

// ---------------------------------------------------------
// Verify
// ---------------------------------------------------------
router
  .route("/verify")
  .post(asyncHandler(userController.verifyUser.bind(userController)));

router
  .route("/:userId/phones/:id/verify")
  .post(asyncHandler(userController.verifyContactPhone.bind(userController)));

router
  .route("/:userId/emails/:id/verify")
  .post(asyncHandler(userController.verifyContactEmail.bind(userController)));

// ---------------------------------------------------------
// Update
// ---------------------------------------------------------
router
  .route("/:userId/profile")
  .patch(asyncHandler(userController.updateProfile.bind(userController)));

router
  .route("/:userId/addresses/:id")
  .patch(asyncHandler(userController.updateAddress.bind(userController)));

router
  .route("/:userId/contact")
  .patch(asyncHandler(userController.updateContact.bind(userController)));

router
  .route("/:userId/phones/:id")
  .patch(asyncHandler(userController.updatePhone.bind(userController)));

router
  .route("/:userId/emails/:id")
  .patch(asyncHandler(userController.updateEmail.bind(userController)));

// ---------------------------------------------------------
// Delete
// ---------------------------------------------------------
router
  .route("/:userId")
  .delete(asyncHandler(userController.deleteProfile.bind(userController)));

router
  .route("/:userId/addresses/:id")
  .delete(asyncHandler(userController.deleteAddress.bind(userController)));

router
  .route("/:userId/contacts/:id")
  .delete(asyncHandler(userController.deleteContact.bind(userController)));

router
  .route("/:userId/phones/:id")
  .delete(asyncHandler(userController.deletePhone.bind(userController)));

router
  .route("/:userId/emails/:id")
  .delete(asyncHandler(userController.deleteEmail.bind(userController)));

export default router;
