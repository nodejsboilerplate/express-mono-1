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
  .route("/addresses")
  .post(
    authMiddlware,
    asyncHandler(userController.createAddressHandler.bind(userController))
  );

router
  .route("/contacts")
  .post(
    authMiddlware,
    asyncHandler(userController.createContactHandler.bind(userController))
  );

router
  .route("/contacts/:id/phones")
  .post(
    authMiddlware,
    asyncHandler(userController.createPhoneHandler.bind(userController))
  );

router
  .route("/contacts/:id/emails")
  .post(
    authMiddlware,
    asyncHandler(userController.createEmailHandler.bind(userController))
  );

// ---------------------------------------------------------
// Read
// ---------------------------------------------------------
router
  .route("/profile")
  .get(
    authMiddlware,
    asyncHandler(userController.getUserProfileHandler.bind(userController))
  );

// ---------------------------------------------------------
// Verify
// ---------------------------------------------------------

router
  .route("/messages/contacts/phones/:id/code")
  .post(
    authMiddlware,
    asyncHandler(
      userController.sendVerificationCodeForPhoneHandler.bind(userController)
    )
  );

router
  .route("/messages/contacts/emails/:id/code")
  .post(
    authMiddlware,
    asyncHandler(userController.sendEmailVerifyCodeHandler.bind(userController))
  );

router
  .route("/verify/contacts/phones/:id")
  .post(
    authMiddlware,
    asyncHandler(userController.verifyContactPhoneHandler.bind(userController))
  );

router
  .route("/verify/contacts/emails/:id")
  .post(
    authMiddlware,
    asyncHandler(userController.verifyContactEmailHandler.bind(userController))
  );

// ---------------------------------------------------------
// Update
// ---------------------------------------------------------
router
  .route("/profile")
  .patch(
    authMiddlware,
    asyncHandler(userController.updateProfileHandler.bind(userController))
  );

router
  .route("/addresses/:id")
  .patch(
    authMiddlware,
    asyncHandler(userController.updateAddressHandler.bind(userController))
  );

router
  .route("/contacts")
  .patch(
    authMiddlware,
    asyncHandler(userController.updateContactHandler.bind(userController))
  );

router
  .route("/contacts/phones/:id")
  .patch(
    authMiddlware,
    asyncHandler(userController.updatePhoneHandler.bind(userController))
  );

router
  .route("/contacts/emails/:id")
  .patch(
    authMiddlware,
    asyncHandler(userController.updateEmailHandler.bind(userController))
  );

// ---------------------------------------------------------
// Delete
// ---------------------------------------------------------
router
  .route("/")
  .delete(
    authMiddlware,
    asyncHandler(userController.deleteUserHandler.bind(userController))
  );

router
  .route("/addresses/:id")
  .delete(
    authMiddlware,
    asyncHandler(userController.deleteAddressHandler.bind(userController))
  );

router
  .route("/contacts/:id")
  .delete(
    authMiddlware,
    asyncHandler(userController.deleteContactHandler.bind(userController))
  );

router
  .route("/contacts/phones/:id")
  .delete(
    authMiddlware,
    asyncHandler(userController.deletePhoneHandler.bind(userController))
  );

router
  .route("/contacts/emails/:id")
  .delete(
    authMiddlware,
    asyncHandler(userController.deleteEmailHandler.bind(userController))
  );

export default router;
