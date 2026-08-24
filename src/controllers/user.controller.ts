import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { users } from "@/database";
import { SystemCustomErrorCode, SystemCustomErrorMsgByCode } from "@/events";
import { ApiError, ApiResponse } from "@/libs";
import { pgDb } from "@/libs/db.connect";
import { UserService } from "@/services/user.service";
import type {
  UserAddressInsertType,
  UserContactInsertType,
  UserEmailsInsertType,
  UserPhonesInsertType,
  UserProfileInsertType,
} from "@/database/type";
import {
  generateVerificationCode,
  getVerifyExpiry,
  isZodError,
  validationError,
} from "@/utils";
import { UserInputValidators } from "@/validators/inputs/user.validator";
import type { CreateUserAddressInputType, CreateUserContactInputType } from "@/zod";

interface UserControllerType {
  createUser(req: Request, res: Response): Promise<Response>;
  createAddress(req: Request, res: Response): Promise<Response>;
  createContact(req: Request, res: Response): Promise<Response>;
  createPhone(req: Request, res: Response): Promise<Response>;
  createEmail(req: Request, res: Response): Promise<Response>;

  verifyUser(req: Request, res: Response): Promise<Response>;
  verifyContactPhone(req: Request, res: Response): Promise<Response>;
  verifyContactEmail(req: Request, res: Response): Promise<Response>;

  updateProfile(req: Request, res: Response): Promise<Response>;
  updateAddress(req: Request, res: Response): Promise<Response>;
  updateContact(req: Request, res: Response): Promise<Response>;
  updatePhone(req: Request, res: Response): Promise<Response>;
  updateEmail(req: Request, res: Response): Promise<Response>;

  deleteProfile(req: Request, res: Response): Promise<Response>;
  deleteAddress(req: Request, res: Response): Promise<Response>;
  deleteContact(req: Request, res: Response): Promise<Response>;
  deletePhone(req: Request, res: Response): Promise<Response>;
  deleteEmail(req: Request, res: Response): Promise<Response>;
}

const userValidators = new UserInputValidators()
export class UserController implements UserControllerType {
  private userService = new UserService();

  // ---------------------------------------------------------
  // Create
  // ---------------------------------------------------------
  async createUser(req: Request, res: Response): Promise<Response> {
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
      role
    })

    if (isZodError(parse_core_user)) throw validationError(parse_core_user);

    const result = await pgDb.transaction(async (tx) => {
      const userId = await this.userService.createUserCore(
        parse_core_user,
        tx
      );

      if (!userId) {
        throw new ApiError(
          500,
          SystemCustomErrorMsgByCode[
          SystemCustomErrorCode.USER_CREATION_FAILED
          ]!
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await this.userService.updateUserCore(
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

      })

      if (isZodError(parse_user_profile)) throw validationError(parse_user_profile);

      const profileId = await this.userService.createUserProfile(
        parse_user_profile,
        tx
      );

      if (!profileId) {
        throw new ApiError(
          500,
          SystemCustomErrorMsgByCode[
          SystemCustomErrorCode.PROFILE_CREATION_FAILED
          ]!
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

  async createAddress(req: Request, res: Response): Promise<Response> {
    const { userId } = req.params as { userId: string };
    const payload = req.body as Omit<CreateUserAddressInputType, "user_id">

    const parse_payload = userValidators.createUserAddressInput({ ...payload, user_id: userId })

    if (isZodError(parse_payload)) throw validationError(parse_payload)

    const result = await this.userService.createUserAddress(
      parse_payload,
      pgDb
    );

    if (!result) {
      throw new ApiError(
        500,
        SystemCustomErrorMsgByCode[
        SystemCustomErrorCode.ADDRESS_CREATION_FAILED
        ]!
      );
    }

    return res
      .status(201)
      .json(
        new ApiResponse(201, "Address added successfully.", { id: result })
      );
  }

  async createContact(req: Request, res: Response): Promise<Response> {
    const { userId } = req.params as { userId: string };

    const payload = req.body as Omit<CreateUserContactInputType, "user_id">

    const parse_payload = userValidators.createUserContactInput({ ...payload, user_id: userId })

    if (isZodError(parse_payload)) throw validationError(parse_payload)

    const result = await this.userService.createUserContact(
      parse_payload,
      pgDb
    );

    if (!result) {
      throw new ApiError(
        500,
        SystemCustomErrorMsgByCode[
        SystemCustomErrorCode.CONTACT_CREATION_FAILED
        ]!
      );
    }

    return res
      .status(201)
      .json(new ApiResponse(201, "Contact added successfully.", { id: result }));
  }

  async createPhone(req: Request, res: Response): Promise<Response> {
    const { contactId, userId } = req.params as {
      contactId: string;
      userId: string;
    };

    const result = await this.userService.createUserPhone(
      userId,
      contactId,
      req.body,
      pgDb
    );

    if (isZodError(result)) throw validationError(result);
    if (!result) {
      throw new ApiError(
        500,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.PHONE_CREATION_FAILED]!
      );
    }

    return res
      .status(201)
      .json(
        new ApiResponse(201, "Phone number added successfully.", { id: result })
      );
  }

  async createEmail(req: Request, res: Response): Promise<Response> {
    const { contactId, userId } = req.params as {
      contactId: string;
      userId: string;
    };

    const result = await this.userService.createUserEmail(
      userId,
      contactId,
      req.body,
      pgDb
    );

    if (isZodError(result)) throw validationError(result);
    if (!result) {
      throw new ApiError(
        500,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.EMAIL_CREATION_FAILED]!
      );
    }

    return res
      .status(201)
      .json(new ApiResponse(201, "Email added successfully.", { id: result }));
  }

  // ---------------------------------------------------------
  // Verify
  // ---------------------------------------------------------

  async verifyUser(req: Request, res: Response): Promise<Response> {
    const { id, code } = req.body;



    const [user] = await pgDb
      .select({
        id: users.id,
        is_verified: users.is_verified,
        verify_code: users.verify_code,
        verify_expiry: users.verify_expiry,
      })
      .from(users)
      .where(eq(users.id, id));

    if (!user) {
      throw new ApiError(
        404,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.USER_NOT_FOUND]!
      );
    }

    if (user.is_verified) {
      throw new ApiError(
        400,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.USER_ALREADY_VERIFIED]!
      );
    }

    if (!user.verify_code || user.verify_code !== code) {
      throw new ApiError(
        400,
        SystemCustomErrorMsgByCode[
        SystemCustomErrorCode.INVALID_VERIFICATION_CODE
        ]!
      );
    }

    if (!user.verify_expiry || user.verify_expiry.getTime() < Date.now()) {
      throw new ApiError(
        400,
        SystemCustomErrorMsgByCode[
        SystemCustomErrorCode.VERIFICATION_CODE_EXPIRED
        ]!
      );
    }

    const [verifiedUser] = await pgDb
      .update(users)
      .set({ is_verified: true, verify_code: null, verify_expiry: null })
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (!verifiedUser?.id) {
      throw new ApiError(
        500,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.USER_UPDATE_FAILED]!
      );
    }

    return res.status(200).json(
      new ApiResponse(200, "Account verified successfully.", {
        id: verifiedUser.id,
      })
    );
  }

  async verifyContactPhone(req: Request, res: Response): Promise<Response> {
    const { id, userId } = req.params as { id: string; userId: string };
    const { code } = req.body ?? {};

    if (!code) {
      throw new ApiError(
        400,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.VALIDATION_ERROR]!,
        undefined,
        ["code is required"]
      );
    }

    const result = await this.userService.updateUserPhone(
      id,
      userId,
      { id, is_verified: true } as UserPhonesInsertType,
      pgDb
    );

    if (isZodError(result)) throw validationError(result);
    if (!result) {
      throw new ApiError(
        404,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.PHONE_NOT_FOUND]!
      );
    }

    return res.status(200).json(
      new ApiResponse(200, "Phone number verified successfully.", {
        id: result,
      })
    );
  }

  async verifyContactEmail(req: Request, res: Response): Promise<Response> {
    const { id, userId } = req.params as { id: string; userId: string };
    const { code } = req.body ?? {};

    if (!code) {
      throw new ApiError(
        400,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.VALIDATION_ERROR]!,
        undefined,
        ["code is required"]
      );
    }

    const result = await this.userService.updateUserEmail(
      id,
      userId,
      { id, is_verified: true } as UserEmailsInsertType,
      pgDb
    );

    if (isZodError(result)) throw validationError(result);
    if (!result) {
      throw new ApiError(
        404,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.EMAIL_NOT_FOUND]!
      );
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

  async updateProfile(req: Request, res: Response): Promise<Response> {
    const { userId } = req.params as { userId: string };
    const result = await this.userService.updateUserProfile(
      userId,
      req.body as UserProfileInsertType,
      pgDb
    );

    if (isZodError(result)) throw validationError(result);
    if (!result) {
      throw new ApiError(
        404,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.PROFILE_NOT_FOUND]!
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Profile updated successfully.", { id: result })
      );
  }

  async updateAddress(req: Request, res: Response): Promise<Response> {
    const { id, userId } = req.params as { id: string; userId: string };
    const result = await this.userService.updateUserAddress(
      userId,
      id,
      req.body as UserAddressInsertType,
      pgDb
    );

    if (isZodError(result)) throw validationError(result);
    if (!result) {
      throw new ApiError(
        404,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.ADDRESS_NOT_FOUND]!
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Address updated successfully.", { id: result })
      );
  }

  async updateContact(req: Request, res: Response): Promise<Response> {
    const { userId } = req.params as { userId: string };
    const result = await this.userService.updateUserContact(
      userId,

      req.body as UserContactInsertType,
      pgDb
    );

    if (isZodError(result)) throw validationError(result);
    if (!result) {
      throw new ApiError(
        404,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.CONTACT_NOT_FOUND]!
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Contact updated successfully.", { id: result })
      );
  }

  async updatePhone(req: Request, res: Response): Promise<Response> {
    const { id, userId } = req.params as { id: string; userId: string };

    const result = await this.userService.updateUserPhone(
      userId,
      id,
      req.body as Partial<UserPhonesInsertType>,
      pgDb
    );

    if (isZodError(result)) throw validationError(result);
    if (!result) {
      throw new ApiError(
        404,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.PHONE_NOT_FOUND]!
      );
    }

    return res.status(200).json(
      new ApiResponse(200, "Phone number updated successfully.", {
        id: result,
      })
    );
  }

  async updateEmail(req: Request, res: Response): Promise<Response> {
    const { id, userId } = req.params as { id: string; userId: string };

    const result = await this.userService.updateUserEmail(
      userId,
      id,
      req.body as Partial<UserEmailsInsertType>,
      pgDb
    );

    if (isZodError(result)) throw validationError(result);
    if (!result) {
      throw new ApiError(
        404,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.EMAIL_NOT_FOUND]!
      );
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

  async deleteProfile(req: Request, res: Response): Promise<Response> {
    const { userId } = req.params as { userId: string };

    // `user_profiles` is 1:1 with `users` and cascade-deletes via the FK
    // (onDelete: "cascade"), so there's no standalone "delete profile"
    // operation on the service layer — deleting the user is what removes
    // the profile row. `id` here is the user id.
    const result = await this.userService.deleteUser(userId, pgDb);

    if (isZodError(result)) throw validationError(result);
    if (!result) {
      throw new ApiError(
        404,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.USER_NOT_FOUND]!
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Account deleted successfully.", { id: result })
      );
  }

  async deleteAddress(req: Request, res: Response): Promise<Response> {
    const { id, userId } = req.params as { id: string; userId: string };

    const result = await this.userService.deleteUserAddress(userId, id, pgDb);

    if (isZodError(result)) throw validationError(result);
    if (!result) {
      throw new ApiError(
        404,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.ADDRESS_NOT_FOUND]!
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Address deleted successfully.", { id: result })
      );
  }

  async deleteContact(req: Request, res: Response): Promise<Response> {
    const { id, userId } = req.params as { id: string; userId: string };

    const result = await this.userService.deleteUserContact(userId, id, pgDb);

    if (isZodError(result)) throw validationError(result);
    if (!result) {
      throw new ApiError(
        404,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.CONTACT_NOT_FOUND]!
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Contact deleted successfully.", { id: result })
      );
  }

  async deletePhone(req: Request, res: Response): Promise<Response> {
    const { id, userId } = req.params as { id: string; userId: string };

    const result = await this.userService.deleteUserPhone(userId, id, pgDb);

    if (isZodError(result)) throw validationError(result);
    if (!result) {
      throw new ApiError(
        404,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.PHONE_NOT_FOUND]!
      );
    }

    return res.status(200).json(
      new ApiResponse(200, "Phone number deleted successfully.", {
        id: result,
      })
    );
  }

  async deleteEmail(req: Request, res: Response): Promise<Response> {
    const { id, userId } = req.params as { id: string; userId: string };

    const result = await this.userService.deleteUserEmail(userId, id, pgDb);

    if (isZodError(result)) throw validationError(result);
    if (!result) {
      throw new ApiError(
        404,
        SystemCustomErrorMsgByCode[SystemCustomErrorCode.EMAIL_NOT_FOUND]!
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Email deleted successfully.", { id: result })
      );
  }
}
