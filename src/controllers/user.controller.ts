import type { Request, Response } from "express";
import type {
  CreateUserAddressInputType,
  CreateUserContactInputType,
  CreateUserEmailInputType,
  CreateUserPhoneInputType,
  CreateUserWithProfileInputType,
  IdZType,
  UpdateAddressInputType,
  UpdateContactInputType,
  UpdateEmailInputType,
  UpdatePhoneInputType,
  UpdateProfileInputType,
  UserIdWithContextIdInputType,
  VerifyCodeWithUserIdInput,
} from "@/zod";

import { ApiResponse } from "@/libs";
import { EmailService, UserService } from "@/services";

const userService = new UserService();
const emailService = new EmailService();

export class UserController {
  // ---------------------------------------------------------
  // Create
  // ---------------------------------------------------------
  async createAddressHandler(req: Request, res: Response): Promise<Response> {
    const payload = req.body as Omit<CreateUserAddressInputType, "user_id">;

    const result = await userService.createUserAddress({
      ...payload,
      user_id: req.auth_user.id,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, "Address added successfully.", { id: result })
      );
  }

  async createContactHandler(req: Request, res: Response): Promise<Response> {
    const payload = req.body as Omit<CreateUserContactInputType, "user_id">;

    const result = await userService.createUserContact({
      ...payload,
      user_id: req.auth_user.id,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, "Contact added successfully.", { id: result })
      );
  }

  async createPhoneHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };

    const payload = req.body as Omit<
      CreateUserPhoneInputType,
      "user_id" | "contact_id"
    >;

    const result = await userService.createUserPhone({
      ...payload,
      user_id: req.auth_user.id,
      contact_id: id,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, "Phone number added successfully.", { id: result })
      );
  }

  async createEmailHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };

    const payload = req.body as Omit<
      CreateUserEmailInputType,
      "user_id" | "contact_id"
    >;

    const result = await userService.createUserEmail({
      ...payload,
      contact_id: id,
      user_id: req.auth_user.id,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, "Email added successfully.", { id: result }));
  }

  // ---------------------------------------------------------
  // Read
  // ---------------------------------------------------------
  async getUserProfileHandler(req: Request, res: Response): Promise<Response> {
    const user = req.auth_user;
    const result = await userService.getUserProfile(user.id);

    return res.status(200).json(new ApiResponse(200, "Ok", result));
  }

  async sendVerificationCodeForPhoneHandler(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params as Pick<UserIdWithContextIdInputType, "id">;
    const result = await userService.sendVerificationCodeForPhone({
      id,
      user_id: req.auth_user.id,
    });

    return res.status(200).json(
      new ApiResponse(200, "Verification code sent successfully.", {
        id: result,
      })
    );
  }

  async sendEmailVerifyCodeHandler(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params as Pick<UserIdWithContextIdInputType, "id">;
    const result = await emailService.sendVerifyEmailCode(
      {
        id,
        user_id: req.auth_user.id,
      },
      req?.headers["user-agent"] ?? "Unknown device"
    );

    return res.status(200).json(
      new ApiResponse(200, "Verification code sent successfully.", {
        id: result,
      })
    );
  }

  // ---------------------------------------------------------
  // Verify
  // ---------------------------------------------------------

  async verifyContactPhoneHandler(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params as Pick<VerifyCodeWithUserIdInput, "id">;
    const { verify_code } = req.body as Pick<
      VerifyCodeWithUserIdInput,
      "verify_code"
    >;

    const result = await userService.verifyContactPhone({
      id,
      user_id: req.auth_user.id,
      verify_code,
    });

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
    const { id } = req.params as Pick<VerifyCodeWithUserIdInput, "id">;
    const { verify_code } = req.body as Pick<
      VerifyCodeWithUserIdInput,
      "verify_code"
    >;

    const result = await userService.verifyContactEmail({
      id,
      user_id: req.auth_user.id,
      verify_code,
    });
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
    const payload = req.body as Omit<UpdateProfileInputType, "user_id">;

    const result = await userService.updateUserProfile({
      ...payload,
      user_id: req.auth_user.id,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Profile updated successfully.", { id: result })
      );
  }

  async updateContactHandler(req: Request, res: Response): Promise<Response> {
    const payload = req.body as Omit<UpdateContactInputType, "user_id">;

    const result = await userService.updateUserContact({
      ...payload,
      user_id: req.auth_user.id,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Contact updated successfully.", { id: result })
      );
  }

  async updatePhoneHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as Pick<UpdatePhoneInputType, "id">;

    const payload = req.body as Omit<UpdatePhoneInputType, "user_id" | "id">;

    const result = await userService.updateUserPhone({
      ...payload,
      id,
      user_id: req.auth_user.id,
    });

    return res.status(200).json(
      new ApiResponse(200, "Phone number updated successfully.", {
        id: result,
      })
    );
  }

  async updateEmailHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as Pick<UpdateEmailInputType, "id">;

    const payload = req.body as Omit<UpdateEmailInputType, "user_id" | "id">;

    const result = await userService.updateUserEmail({
      ...payload,
      id,
      user_id: req.auth_user.id,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Email updated successfully.", { id: result })
      );
  }

  async updateAddressHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as Pick<UpdateAddressInputType, "id">;
    const payload = req.body as Omit<UpdateAddressInputType, "user_id" | "id">;

    const result = await userService.updateUserAddress({
      ...payload,
      id,
      user_id: req.auth_user.id,
    });

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
    const result = await userService.deleteUser(req.auth_user.id);

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Account deleted successfully.", { id: result })
      );
  }

  async deleteAddressHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as Pick<UserIdWithContextIdInputType, "id">;

    const result = await userService.deleteUserAddress({
      id,
      user_id: req.auth_user.id,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Address deleted successfully.", { id: result })
      );
  }

  async deleteContactHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as Pick<UserIdWithContextIdInputType, "id">;

    const result = await userService.deleteUserContact({
      id,
      user_id: req.auth_user.id,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Contact deleted successfully.", { id: result })
      );
  }

  async deletePhoneHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as Pick<UserIdWithContextIdInputType, "id">;

    const result = await userService.deleteUserPhone({
      id,
      user_id: req.auth_user.id,
    });

    return res.status(200).json(
      new ApiResponse(200, "Phone number deleted successfully.", {
        id: result,
      })
    );
  }

  async deleteEmailHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as Pick<UserIdWithContextIdInputType, "id">;

    const result = await userService.deleteUserEmail({
      id,
      user_id: req.auth_user.id,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Email deleted successfully.", { id: result })
      );
  }
}
