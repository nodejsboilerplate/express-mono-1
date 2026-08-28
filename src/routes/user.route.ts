import { Router } from "express";
import { UserController } from "@/controllers/user.controller";
import { asyncHandler } from "@/utils";
import { authMiddlware } from "@/middlewares/auth.middleware";

const router: Router = Router();
const userController = new UserController();

// ---------------------------------------------------------
// Create
// ---------------------------------------------------------
router
  .route("/")
  .post(asyncHandler(userController.createUserHandler.bind(userController)));

router
  .route("/:user_id/address")
  .post(asyncHandler(userController.createAddressHandler.bind(userController)));

router
  .route("/:user_id/contact")
  .post(asyncHandler(userController.createContactHandler.bind(userController)));

router
  .route("/:user_id/contact/:contactId/phone")
  .post(asyncHandler(userController.createPhoneHandler.bind(userController)));

router
  .route("/:user_id/contact/:contactId/email")
  .post(asyncHandler(userController.createEmailHandler.bind(userController)));

// ---------------------------------------------------------
// Auth
// ---------------------------------------------------------
router
  .route("/login")
  .post(asyncHandler(userController.loginUserHandler.bind(userController)));

// ---------------------------------------------------------
// Read
// ---------------------------------------------------------
router
  .route("/core/:email")
  .get(
    authMiddlware,
    asyncHandler(userController.getUserCoreHandler.bind(userController))
  );

// ---------------------------------------------------------
// Verify
// ---------------------------------------------------------
router
  .route("/:id/verify")
  .post(asyncHandler(userController.verifyUserHandler.bind(userController)));

router
  .route("/:user_id/phone/:id/verify")
  .post(
    asyncHandler(userController.verifyContactPhoneHandler.bind(userController))
  );

router
  .route("/:user_id/email/:id/verify")
  .post(
    asyncHandler(userController.verifyContactEmailHandler.bind(userController))
  );

// ---------------------------------------------------------
// Update
// ---------------------------------------------------------
router
  .route("/:user_id/profile")
  .patch(
    asyncHandler(userController.updateProfileHandler.bind(userController))
  );

router
  .route("/:user_id/address/:id")
  .patch(
    asyncHandler(userController.updateAddressHandler.bind(userController))
  );

router
  .route("/:user_id/contact")
  .patch(
    asyncHandler(userController.updateContactHandler.bind(userController))
  );

router
  .route("/:user_id/phone/:id")
  .patch(asyncHandler(userController.updatePhoneHandler.bind(userController)));

router
  .route("/:user_id/email/:id")
  .patch(asyncHandler(userController.updateEmailHandler.bind(userController)));

// ---------------------------------------------------------
// Delete
// ---------------------------------------------------------
router
  .route("/:user_id")
  .delete(
    asyncHandler(userController.deleteProfileHandler.bind(userController))
  );

router
  .route("/:user_id/address/:id")
  .delete(
    asyncHandler(userController.deleteAddressHandler.bind(userController))
  );

router
  .route("/:user_id/contact/:id")
  .delete(
    asyncHandler(userController.deleteContactHandler.bind(userController))
  );

router
  .route("/:user_id/phone/:id")
  .delete(asyncHandler(userController.deletePhoneHandler.bind(userController)));

router
  .route("/:user_id/email/:id")
  .delete(asyncHandler(userController.deleteEmailHandler.bind(userController)));

export default router;
