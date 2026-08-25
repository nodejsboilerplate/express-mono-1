import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { userEmails, userPhones, users } from "@/database";
import {
  getSystemCustomErrorMsgByKey,
} from "@/events";
import { ApiError, ApiResponse } from "@/libs";
import { pgDb } from "@/libs/db.connect";
import { UserService } from "@/services/user.service";
import {
  generateVerificationCode,
  getVerifyExpiry,
  isZodError,
  validationError,
} from "@/utils";
import { UserInputValidators } from "@/validators/inputs/user.validator";
import type {
  CreateUserAddressInputType,
  CreateUserContactInputType,
  UpdateAddressInputType,
  UpdateContactInputType,
  UpdateEmailInputType,
  UpdatePhoneInputType,
  UpdateProfileInputType,
} from "@/zod";

interface UserControllerType {
  // ---------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------
  createUserHandler(req: Request, res: Response): Promise<Response>;
  createAddressHandler(req: Request, res: Response): Promise<Response>;
  createContactHandler(req: Request, res: Response): Promise<Response>;
  createPhoneHandler(req: Request, res: Response): Promise<Response>;
  createEmailHandler(req: Request, res: Response): Promise<Response>;

  // ---------------------------------------------------------------
  // Verify
  // ---------------------------------------------------------------
  verifyUserHandler(req: Request, res: Response): Promise<Response>;
  verifyContactPhoneHandler(req: Request, res: Response): Promise<Response>;
  verifyContactEmailHandler(req: Request, res: Response): Promise<Response>;

  // ---------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------
  updateProfileHandler(req: Request, res: Response): Promise<Response>;
  updateAddressHandler(req: Request, res: Response): Promise<Response>;
  updateContactHandler(req: Request, res: Response): Promise<Response>;
  updatePhoneHandler(req: Request, res: Response): Promise<Response>;
  updateEmailHandler(req: Request, res: Response): Promise<Response>;

  // ---------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------
  deleteProfileHandler(req: Request, res: Response): Promise<Response>;
  deleteAddressHandler(req: Request, res: Response): Promise<Response>;
  deleteContactHandler(req: Request, res: Response): Promise<Response>;
  deletePhoneHandler(req: Request, res: Response): Promise<Response>;
  deleteEmailHandler(req: Request, res: Response): Promise<Response>;
}

const userValidators = new UserInputValidators();
export class UserController extends UserService implements UserControllerType {
  // ---------------------------------------------------------
  // Create
  // ---------------------------------------------------------
  async createUserHandler(req: Request, res: Response): Promise<Response> {
    const {
      email,
      username,
      password,
      role,
      first_name,
      last_name,
      avatar,
      cover_img,
      nickname,
      date_of_birth,
      gender,
    } = req.body;

    const verify_code = generateVerificationCode();
    const verify_expiry = getVerifyExpiry();

    const parse_core_user = userValidators.createUserCoreInput({
      email,
      password,
      username,
      role,
    });

    if (isZodError(parse_core_user)) throw validationError(parse_core_user);

    const result = await pgDb.transaction(async (tx) => {
      const userId = await this.createUserCore(parse_core_user, tx);

      if (!userId) {
        throw new ApiError(
          500,
          getSystemCustomErrorMsgByKey("USER_CREATION_FAILED")
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await this.updateUserCore(
        { password: hashedPassword, verify_code, verify_expiry, id: userId },
        tx
      );

      const parse_user_profile = userValidators.createUserProfileInput({
        user_id: userId,
        first_name,
        last_name,
        avatar,
        cover_img,
        nickname,
        date_of_birth,
        gender,
      });

      if (isZodError(parse_user_profile))
        throw validationError(parse_user_profile);

      const profileId = await this.createUserProfile(parse_user_profile, tx);

      if (!profileId) {
        throw new ApiError(
          500,
          getSystemCustomErrorMsgByKey("PROFILE_CREATION_FAILED")
        );
      }

      return { userId, profileId };
    });

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          "Account created successfully. Please verify your account using the code sent to you.",
          { id: result.userId, profile_id: result.profileId }
        )
      );
  }

  async createAddressHandler(req: Request, res: Response): Promise<Response> {
    const { user_id } = req.params as { user_id: string };
    const payload = req.body as Omit<CreateUserAddressInputType, "user_id">;

    const parse_payload = userValidators.createUserAddressInput({
      ...payload,
      user_id,
    });

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const result = await this.createUserAddress(parse_payload, pgDb);

    if (!result) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("ADDRESS_CREATION_FAILED")
      );
    }

    return res
      .status(201)
      .json(
        new ApiResponse(201, "Address added successfully.", { id: result })
      );
  }

  async createContactHandler(req: Request, res: Response): Promise<Response> {
    const { user_id } = req.params as { user_id: string };

    const payload = req.body as Omit<CreateUserContactInputType, "user_id">;

    const parse_payload = userValidators.createUserContactInput({
      ...payload,
      user_id,
    });

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const result = await this.createUserContact(parse_payload, pgDb);

    if (!result) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("CONTACT_CREATION_FAILED")
      );
    }

    return res
      .status(201)
      .json(
        new ApiResponse(201, "Contact added successfully.", { id: result })
      );
  }

  async createPhoneHandler(req: Request, res: Response): Promise<Response> {
    const { contactId, user_id } = req.params as {
      contactId: string;
      user_id: string;
    };

    const payload = req.body;

    const parse_payload = userValidators.createUserPhoneInput({
      ...payload,
      user_id,
      contact_id: contactId,
    });

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const result = await this.createUserPhone(parse_payload, pgDb);

    if (!result) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("PHONE_CREATION_FAILED")
      );
    }

    return res
      .status(201)
      .json(
        new ApiResponse(201, "Phone number added successfully.", { id: result })
      );
  }

  async createEmailHandler(req: Request, res: Response): Promise<Response> {
    const { contactId, user_id } = req.params as {
      contactId: string;
      user_id: string;
    };
    const payload = req.body;

    const parse_payload = userValidators.createUserEmailInput({
      ...payload,
      user_id,
      contact_id: contactId,
    });

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const result = await this.createUserEmail(parse_payload, pgDb);

    if (!result) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("EMAIL_CREATION_FAILED")
      );
    }

    return res
      .status(201)
      .json(new ApiResponse(201, "Email added successfully.", { id: result }));
  }

  // ---------------------------------------------------------
  // Verify
  // ---------------------------------------------------------

  async verifyUserHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const { code } = req.body;

    const parse_payload = userValidators.verifyCodeInput({ id, code });
    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const [user] = await pgDb
      .select({
        id: users.id,
        is_verified: users.is_verified,
        verify_code: users.verify_code,
        verify_expiry: users.verify_expiry,
      })
      .from(users)
      .where(eq(users.id, parse_payload.id));

    if (!user) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("USER_NOT_FOUND"));
    }

    if (user.is_verified) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("USER_ALREADY_VERIFIED")
      );
    }

    if (!user.verify_code || user.verify_code !== parse_payload.code) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("INVALID_VERIFICATION_CODE")
      );
    }

    if (!user.verify_expiry || user.verify_expiry.getTime() < Date.now()) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("VERIFICATION_CODE_EXPIRED")
      );
    }

    const verifiedUserId = await this.updateUserCore(
      {
        id: parse_payload.id,
        is_verified: true,
        verify_code: null,
        verify_expiry: null,
      },
      pgDb
    );

    if (!verifiedUserId) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("USER_UPDATE_FAILED")
      );
    }

    return res.status(200).json(
      new ApiResponse(200, "Account verified successfully.", {
        id: verifiedUserId,
      })
    );
  }

  async verifyContactPhoneHandler(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id, user_id } = req.params as { id: string; user_id: string };
    const { code } = req.body;

    const parse_payload = userValidators.verifyCodeWithUserId({
      code,
      id,
      user_id,
    });

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const [user_phone] = await pgDb
      .select({
        id: userPhones.id,
        is_verified: userPhones.is_verified,
        verify_code: userPhones.verify_code,
        verify_expiry: userPhones.verify_expiry,
      })
      .from(userPhones)
      .where(eq(userPhones.id, parse_payload.id));

    if (!user_phone) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    if (user_phone.is_verified) {
      throw new ApiError(
        409,
        getSystemCustomErrorMsgByKey("PHONE_ALREADY_VERIFIED")
      );
    }

    if (
      !user_phone.verify_code ||
      user_phone.verify_code !== parse_payload.code
    ) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("INVALID_VERIFICATION_CODE")
      );
    }

    if (
      !user_phone.verify_expiry ||
      user_phone.verify_expiry.getTime() < Date.now()
    ) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("VERIFICATION_CODE_EXPIRED")
      );
    }

    const result = await this.updateUserPhone(
      { ...parse_payload, is_verified: true },
      pgDb
    );

    if (!result) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    return res.status(200).json(
      new ApiResponse(200, "Phone number verified successfully.", {
        id: result,
      })
    );
  }

  async verifyContactEmailHandler(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id, user_id } = req.params as { id: string; user_id: string };
    const { code } = req.body ?? {};

    const parse_payload = userValidators.verifyCodeWithUserId({
      code,
      id,
      user_id,
    });

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const [user_email] = await pgDb
      .select({
        id: userEmails.id,
        is_verified: userEmails.is_verified,
        verify_code: userEmails.verify_code,
        verify_expiry: userEmails.verify_expiry,
      })
      .from(userEmails)
      .where(eq(userEmails.id, parse_payload.id));

    if (!user_email) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("EMAIL_NOT_FOUND"));
    }

    if (user_email.is_verified) {
      throw new ApiError(
        409,
        getSystemCustomErrorMsgByKey("EMAIL_ALREADY_VERIFIED")
      );
    }

    if (
      !user_email.verify_code ||
      user_email.verify_code !== parse_payload.code
    ) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("INVALID_VERIFICATION_CODE")
      );
    }

    if (
      !user_email.verify_expiry ||
      user_email.verify_expiry.getTime() < Date.now()
    ) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("VERIFICATION_CODE_EXPIRED")
      );
    }

    const result = await this.updateUserEmail(
      { ...parse_payload, is_verified: true },
      pgDb
    );

    if (!result) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("EMAIL_NOT_FOUND"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Email verified successfully.", { id: result })
      );
  }

  // ---------------------------------------------------------
  // Update
  // ---------------------------------------------------------

  async updateProfileHandler(req: Request, res: Response): Promise<Response> {
    const { user_id } = req.params as { user_id: string };
    const payload = req.body as Omit<UpdateProfileInputType, "user_id">;

    const parse_payload = userValidators.updateUserProfileInput({
      ...payload,
      user_id,
    });

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const result = await this.updateUserProfile(parse_payload, pgDb);

    if (!result) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Profile updated successfully.", { id: result })
      );
  }

  async updateAddressHandler(req: Request, res: Response): Promise<Response> {
    const { id, user_id } = req.params as { id: string; user_id: string };
    const payload = req.body as Omit<UpdateAddressInputType, "user_id" | "id">;
    const parse_payload = userValidators.updateUserAddressInput({
      ...payload,
      user_id,
      id,
    });

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const result = await this.updateUserAddress(parse_payload, pgDb);

    if (!result) {
      throw new ApiError(
        404,
        getSystemCustomErrorMsgByKey("ADDRESS_NOT_FOUND")
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Address updated successfully.", { id: result })
      );
  }

  async updateContactHandler(req: Request, res: Response): Promise<Response> {
    const { user_id } = req.params as { user_id: string };

    const payload = req.body as Omit<UpdateContactInputType, "user_id">;
    const parse_payload = userValidators.updateUserContactInput({
      ...payload,
      user_id,
    });

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const result = await this.updateUserContact(parse_payload, pgDb);

    if (!result) {
      throw new ApiError(
        404,
        getSystemCustomErrorMsgByKey("CONTACT_NOT_FOUND")
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Contact updated successfully.", { id: result })
      );
  }

  async updatePhoneHandler(req: Request, res: Response): Promise<Response> {
    const { id, user_id } = req.params as { id: string; user_id: string };

    const payload = req.body as Omit<UpdatePhoneInputType, "user_id" | "id">;
    const parse_payload = userValidators.updateUserPhoneInput({
      ...payload,
      user_id,
      id,
    });

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const result = await this.updateUserPhone(parse_payload, pgDb);

    if (!result) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    return res.status(200).json(
      new ApiResponse(200, "Phone number updated successfully.", {
        id: result,
      })
    );
  }

  async updateEmailHandler(req: Request, res: Response): Promise<Response> {
    const { id, user_id } = req.params as { id: string; user_id: string };

    const payload = req.body as Omit<UpdateEmailInputType, "user_id" | "id">;
    const parse_payload = userValidators.updateUserEmailInput({
      ...payload,
      user_id,
      id,
    });

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const result = await this.updateUserEmail(parse_payload, pgDb);

    if (!result) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("EMAIL_NOT_FOUND"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Email updated successfully.", { id: result })
      );
  }

  // ---------------------------------------------------------
  // Delete
  // ---------------------------------------------------------

  async deleteProfileHandler(req: Request, res: Response): Promise<Response> {
    const { user_id } = req.params as { user_id: string };

    const parse_id = userValidators.idInput(user_id);

    if (isZodError(parse_id)) throw validationError(parse_id);

    // `user_profiles` is 1:1 with `users` and cascade-deletes via the FK
    // (onDelete: "cascade"), so there's no standalone "delete profile"
    // operation on the service layer — deleting the user is what removes
    // the profile row. `id` here is the user id.
    const result = await this.deleteUser(parse_id, pgDb);

    if (!result) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("USER_NOT_FOUND"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Account deleted successfully.", { id: result })
      );
  }

  async deleteAddressHandler(req: Request, res: Response): Promise<Response> {
    const { id, user_id } = req.params as { id: string; user_id: string };

    const parse_payload = userValidators.deleteByUserIdWithContextIdInput({
      id,
      user_id,
    });

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const result = await this.deleteUserAddress(parse_payload, pgDb);

    if (!result) {
      throw new ApiError(
        404,
        getSystemCustomErrorMsgByKey("ADDRESS_NOT_FOUND")
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Address deleted successfully.", { id: result })
      );
  }

  async deleteContactHandler(req: Request, res: Response): Promise<Response> {
    const { id, user_id } = req.params as { id: string; user_id: string };

    const parse_payload = userValidators.deleteByUserIdWithContextIdInput({
      id,
      user_id,
    });

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const result = await this.deleteUserContact(parse_payload, pgDb);

    if (!result) {
      throw new ApiError(
        404,
        getSystemCustomErrorMsgByKey("CONTACT_NOT_FOUND")
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Contact deleted successfully.", { id: result })
      );
  }

  async deletePhoneHandler(req: Request, res: Response): Promise<Response> {
    const { id, user_id } = req.params as { id: string; user_id: string };

    const parse_payload = userValidators.deleteByUserIdWithContextIdInput({
      id,
      user_id,
    });
    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const result = await this.deleteUserPhone(parse_payload, pgDb);

    if (!result) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    return res.status(200).json(
      new ApiResponse(200, "Phone number deleted successfully.", {
        id: result,
      })
    );
  }

  async deleteEmailHandler(req: Request, res: Response): Promise<Response> {
    const { id, user_id } = req.params as { id: string; user_id: string };

    const parse_payload = userValidators.deleteByUserIdWithContextIdInput({
      id,
      user_id,
    });
    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const result = await this.deleteUserEmail(parse_payload, pgDb);

    if (!result) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("EMAIL_NOT_FOUND"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Email deleted successfully.", { id: result })
      );
  }
}
