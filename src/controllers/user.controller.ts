import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { userEmailsTable, userPhonesTable, usersTable } from "@/database";
import { getSystemCustomErrorMsgByKey } from "@/events";
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
  CreateUserEmailInputType,
  CreateUserPhoneInputType,
  CreateUserWithProfileInputType,
  IdZType,
  LoginUserInputType,
  UpdateAddressInputType,
  UpdateContactInputType,
  UpdateEmailInputType,
  UpdatePhoneInputType,
  UpdateProfileInputType,
  UserIdWithContextIdInputType,
  VerifyCodeInputType,
  VerifyCodeWithUserIdInput,
} from "@/zod";
import { AuthService, CookieService } from "@/services";
import { userRedisManager } from "@/redis";

const authService = AuthService.create();

const userValidators = new UserInputValidators();
export class UserController extends UserService {
  // ---------------------------------------------------------
  // Create
  // ---------------------------------------------------------
  async createUserHandler(req: Request, res: Response): Promise<Response> {
    const payload = req.body as CreateUserWithProfileInputType["user"] &
      CreateUserWithProfileInputType["profile"];

    const {
      email,
      password,
      username,
      role,
      first_name,
      avatar,
      cover_img,
      date_of_birth,
      gender,
      last_name,
      nickname,
    } = payload;

    const result = await this.createUserWithProfile({
      user: {
        email,
        password,
        username,
        role,
      },
      profile: {
        first_name,
        avatar,
        cover_img,
        date_of_birth,
        gender,
        last_name,
        nickname,
      },
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
    const { user_id } = req.params as Pick<
      CreateUserAddressInputType,
      "user_id"
    >;
    const payload = req.body as Omit<CreateUserAddressInputType, "user_id">;

    const result = await this.createUserAddress({ ...payload, user_id });

    return res
      .status(201)
      .json(
        new ApiResponse(201, "Address added successfully.", { id: result })
      );
  }

  async createContactHandler(req: Request, res: Response): Promise<Response> {
    const { user_id } = req.params as Pick<
      CreateUserContactInputType,
      "user_id"
    >;

    const payload = req.body as Omit<CreateUserContactInputType, "user_id">;

    const result = await this.createUserContact({ ...payload, user_id });

    return res
      .status(201)
      .json(
        new ApiResponse(201, "Contact added successfully.", { id: result })
      );
  }

  async createPhoneHandler(req: Request, res: Response): Promise<Response> {
    const { contact_id, user_id } = req.params as Pick<
      CreateUserPhoneInputType,
      "user_id" | "contact_id"
    >;

    const payload = req.body as Omit<
      CreateUserPhoneInputType,
      "user_id" | "contact_id"
    >;

    const result = await this.createUserPhone({
      ...payload,
      user_id,
      contact_id,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, "Phone number added successfully.", { id: result })
      );
  }

  async createEmailHandler(req: Request, res: Response): Promise<Response> {
    const { contact_id, user_id } = req.params as Pick<
      CreateUserEmailInputType,
      "user_id" | "contact_id"
    >;

    const payload = req.body as Omit<
      CreateUserEmailInputType,
      "user_id" | "contact_id"
    >;

    const result = await this.createUserEmail({
      ...payload,
      contact_id,
      user_id,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, "Email added successfully.", { id: result }));
  }

  // ---------------------------------------------------------
  // Read
  // ---------------------------------------------------------
  async getUserCoreHandler(req: Request, res: Response): Promise<Response> {
    const { email } = req.params as { email: string };
    const parse_payload = userValidators.emailInput(email);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const result = await pgDb.query.usersTable.findFirst({
      columns: {
        id: true,
        email: true,
        username: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
      where: {
        email: { eq: parse_payload },
      },
    });

    if (!result) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("USER_NOT_FOUND"));
    }

    return res.status(200).json(new ApiResponse(200, "Ok", result));
  }

  // ---------------------------------------------------------
  // Auth
  // ---------------------------------------------------------
  async loginUserHandler(req: Request, res: Response): Promise<Response> {
    const payload = req.body as LoginUserInputType;
    const parse_payload = userValidators.loginUserInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const result = await pgDb.query.usersTable.findFirst({
      columns: {
        id: true,
        email: true,
        password: true,
        username: true,
        role: true,
        is_verified: true,
      },
      where: {
        OR: [
          {
            email: { eq: parse_payload.identifier },
          },
          {
            username: { eq: parse_payload.identifier },
          },
        ],
      },
    });

    if (!result?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("USER_NOT_FOUND"));
    }

    const isPassMatched = await bcrypt.compare(
      parse_payload.password,
      result.password
    );
    if (!isPassMatched) {
      throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED"));
    }

    const { accessToken, refreshToken } = authService.createTokens(result);

    res.cookie(
      CookieService.ACCESS_TOKEN.name,
      accessToken,
      CookieService.ACCESS_TOKEN.cookie
    );

    res.cookie(
      CookieService.REFRESH_TOKEN.name,
      refreshToken,
      CookieService.REFRESH_TOKEN.cookie
    );

    const { password, ...rest } = result;

    await userRedisManager.cacheUserLoginData(result?.id as string, rest);

    return res.status(200).json(new ApiResponse(200, "Login Successful."));
  }

  // ---------------------------------------------------------
  // Send Verification Code
  // ---------------------------------------------------------

  async sendVerificationCodeForUserHandler(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params as { id: IdZType };
    const result = await this.sendVerificationCodeForUser(id);

    return res.status(200).json(
      new ApiResponse(200, "Verification code sent successfully.", {
        id: result,
      })
    );
  }

  async sendVerificationCodeForPhoneHandler(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id, user_id } = req.params as UserIdWithContextIdInputType;
    const result = await this.sendVerificationCodeForPhone({ id, user_id });

    return res.status(200).json(
      new ApiResponse(200, "Verification code sent successfully.", {
        id: result,
      })
    );
  }

  async sendVerificationCodeForEmailHandler(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id, user_id } = req.params as UserIdWithContextIdInputType;
    const result = await this.sendVerificationCodeForEmail({ id, user_id });

    return res.status(200).json(
      new ApiResponse(200, "Verification code sent successfully.", {
        id: result,
      })
    );
  }

  // ---------------------------------------------------------
  // Verify
  // ---------------------------------------------------------
  async verifyUserHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as Pick<VerifyCodeInputType, "id">;
    const { verify_code } = req.body as Pick<
      VerifyCodeInputType,
      "verify_code"
    >;

    const result = await this.verifyUser({ verify_code, id });

    return res.status(200).json(
      new ApiResponse(200, "Account verified successfully.", {
        id: result,
      })
    );
  }

  async verifyContactPhoneHandler(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id, user_id } = req.params as Pick<
      VerifyCodeWithUserIdInput,
      "id" | "user_id"
    >;
    const { verify_code } = req.body as Pick<
      VerifyCodeWithUserIdInput,
      "verify_code"
    >;

    const result = await this.verifyContactPhone({ id, user_id, verify_code });

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
    const { id, user_id } = req.params as Pick<
      VerifyCodeWithUserIdInput,
      "id" | "user_id"
    >;
    const { verify_code } = req.body as Pick<
      VerifyCodeWithUserIdInput,
      "verify_code"
    >;

    const result = await this.verifyContactEmail({ id, user_id, verify_code });
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
    const { user_id } = req.params as Pick<UpdateProfileInputType, "user_id">;
    const payload = req.body as Omit<UpdateProfileInputType, "user_id">;

    const result = await this.updateUserProfile({ ...payload, user_id });

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Profile updated successfully.", { id: result })
      );
  }

  async updateContactHandler(req: Request, res: Response): Promise<Response> {
    const { user_id } = req.params as Pick<UpdateContactInputType, "user_id">;

    const payload = req.body as Omit<UpdateContactInputType, "user_id">;

    const result = await this.updateUserContact({ ...payload, user_id });

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Contact updated successfully.", { id: result })
      );
  }

  async updatePhoneHandler(req: Request, res: Response): Promise<Response> {
    const { id, user_id } = req.params as Pick<
      UpdatePhoneInputType,
      "user_id" | "id"
    >;

    const payload = req.body as Omit<UpdatePhoneInputType, "user_id" | "id">;

    const result = await this.updateUserPhone({ ...payload, id, user_id });

    return res.status(200).json(
      new ApiResponse(200, "Phone number updated successfully.", {
        id: result,
      })
    );
  }

  async updateEmailHandler(req: Request, res: Response): Promise<Response> {
    const { id, user_id } = req.params as Pick<
      UpdateEmailInputType,
      "user_id" | "id"
    >;

    const payload = req.body as Omit<UpdateEmailInputType, "user_id" | "id">;

    const result = await this.updateUserEmail({ ...payload, id, user_id });

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Email updated successfully.", { id: result })
      );
  }

  async updateAddressHandler(req: Request, res: Response): Promise<Response> {
    const { id, user_id } = req.params as { id: string; user_id: string };
    const payload = req.body as Omit<UpdateAddressInputType, "user_id" | "id">;

    const result = await this.updateUserAddress({ ...payload, id, user_id });

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Address updated successfully.", { id: result })
      );
  }

  // ---------------------------------------------------------
  // Delete
  // ---------------------------------------------------------

  async deleteUserHandler(req: Request, res: Response): Promise<Response> {
    const { user_id } = req.params as { user_id: IdZType };

    const result = await this.deleteUser(user_id);

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Account deleted successfully.", { id: result })
      );
  }

  async deleteAddressHandler(req: Request, res: Response): Promise<Response> {
    const { id, user_id } = req.params as UserIdWithContextIdInputType;

    const result = await this.deleteUserAddress({ id, user_id });

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Address deleted successfully.", { id: result })
      );
  }

  async deleteContactHandler(req: Request, res: Response): Promise<Response> {
    const { id, user_id } = req.params as UserIdWithContextIdInputType;

    const result = await this.deleteUserContact({ id, user_id });

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Contact deleted successfully.", { id: result })
      );
  }

  async deletePhoneHandler(req: Request, res: Response): Promise<Response> {
    const { id, user_id } = req.params as UserIdWithContextIdInputType;

    const result = await this.deleteUserPhone({ id, user_id });

    return res.status(200).json(
      new ApiResponse(200, "Phone number deleted successfully.", {
        id: result,
      })
    );
  }

  async deleteEmailHandler(req: Request, res: Response): Promise<Response> {
    const { id, user_id } = req.params as UserIdWithContextIdInputType;

    const result = await this.deleteUserEmail({ id, user_id });

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Email deleted successfully.", { id: result })
      );
  }
}
