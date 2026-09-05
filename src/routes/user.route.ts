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
  .route("/address")
  .post(
    authMiddlware,
    asyncHandler(userController.createAddressHandler.bind(userController))
  );

router
  .route("/contact")
  .post(
    authMiddlware,
    asyncHandler(userController.createContactHandler.bind(userController))
  );

router
  .route("/contact/:id/phone")
  .post(
    authMiddlware,
    asyncHandler(userController.createPhoneHandler.bind(userController))
  );

router
  .route("/contact/:id/email")
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
  .route("/phone/:id/send-verification-code")
  .post(
    authMiddlware,
    asyncHandler(
      userController.sendVerificationCodeForPhoneHandler.bind(userController)
    )
  );

router
  .route("/email/:id/send-verification-code")
  .post(
    authMiddlware,
    asyncHandler(
      userController.sendVerificationCodeForEmailHandler.bind(userController)
    )
  );

router
  .route("/phone/:id/verify")
  .post(
    authMiddlware,
    asyncHandler(userController.verifyContactPhoneHandler.bind(userController))
  );

router
  .route("/email/:id/verify")
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
  .route("/address/:id")
  .patch(
    authMiddlware,
    asyncHandler(userController.updateAddressHandler.bind(userController))
  );

router
  .route("/contact")
  .patch(
    authMiddlware,
    asyncHandler(userController.updateContactHandler.bind(userController))
  );

router
  .route("/phone/:id")
  .patch(
    authMiddlware,
    asyncHandler(userController.updatePhoneHandler.bind(userController))
  );

router
  .route("/email/:id")
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
  .route("/address/:id")
  .delete(
    authMiddlware,
    asyncHandler(userController.deleteAddressHandler.bind(userController))
  );

router
  .route("/contact/:id")
  .delete(
    authMiddlware,
    asyncHandler(userController.deleteContactHandler.bind(userController))
  );

router
  .route("/phone/:id")
  .delete(
    authMiddlware,
    asyncHandler(userController.deletePhoneHandler.bind(userController))
  );

router
  .route("/email/:id")
  .delete(
    authMiddlware,
    asyncHandler(userController.deleteEmailHandler.bind(userController))
  );

export default router;
