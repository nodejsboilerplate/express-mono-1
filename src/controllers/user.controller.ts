import type { Request, Response } from "express";
import type {
  CreateUserAddressInputType,
  CreateUserContactInputType,
  CreateUserEmailInputType,
  CreateUserPhoneInputType,
  UpdateAddressInputType,
  UpdateContactInputType,
  UpdateEmailInputType,
  UpdatePhoneInputType,
  UpdateProfileInputType,
  UserIdWithContextIdInputType,
} from "@/zod";

import { ApiResponse } from "@/libs";
import { UserService } from "@/services";

type UserControllerDepsType = {
  userService: UserService;
};

export class UserController {
  private userService: UserService;

  constructor({ userService }: UserControllerDepsType) {
    this.userService = userService;
  }
  // ---------------------------------------------------------
  // Create
  // ---------------------------------------------------------
  async createAddressHandler(req: Request, res: Response): Promise<Response> {
    const payload = req.body as Omit<CreateUserAddressInputType, "user_id">;

    const result = await this.userService.createUserAddress({
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

    const result = await this.userService.createUserContact({
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

    const result = await this.userService.createUserPhone({
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

    const result = await this.userService.createUserEmail({
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
    const result = await this.userService.getUserProfile(user.id);

    return res.status(200).json(new ApiResponse(200, "Ok", result));
  }

  // ---------------------------------------------------------
  // Update
  // ---------------------------------------------------------

  async updateProfileHandler(req: Request, res: Response): Promise<Response> {
    const payload = req.body as Omit<UpdateProfileInputType, "user_id">;

    const result = await this.userService.updateUserProfile({
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

    const result = await this.userService.updateUserContact({
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

    const result = await this.userService.updateUserPhone({
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

    const result = await this.userService.updateUserEmail({
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

    const result = await this.userService.updateUserAddress({
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
    const result = await this.userService.deleteUser(req.auth_user.id);

    return res
      .status(200)
      .json(
        new ApiResponse(200, "Account deleted successfully.", { id: result })
      );
  }

  async deleteAddressHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as Pick<UserIdWithContextIdInputType, "id">;

    const result = await this.userService.deleteUserAddress({
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

    const result = await this.userService.deleteUserContact({
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

    const result = await this.userService.deleteUserPhone({
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

    const result = await this.userService.deleteUserEmail({
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
