import {
  UserZSchema,
  type CreateUserAddressInputType,
  type CreateUserContactInputType,
  type CreateUserEmailInputType,
  type CreateUserPhoneInputType,
  type CreateUserWithProfileInputType,
  type UserIdWithContextIdInputType,
  type EmailZType,
  type LoginUserInputType,
  type UpdateAddressInputType,
  type UpdateContactInputType,
  type UpdateEmailInputType,
  type UpdatePhoneInputType,
  type UpdateProfileInputType,
  type UpdateUserInputType,
  type VerifyCodeInputType,
  type VerifyCodeWithUserIdInput,
} from "@/zod";
import type z from "zod";
import { Validator } from "../validator";

class UserInputValidators extends Validator {

  emailInput(payload: EmailZType): EmailZType | z.ZodError {
    const { data, success, error } = this.validate(
      payload,
      UserZSchema.email
    );

    if (!success) {
      return error;
    }
    return data;
  }

  createUserWithProfileInput(
    payload: CreateUserWithProfileInputType
  ): CreateUserWithProfileInputType | z.ZodError {
    const { data, success, error } = this.validate(
      payload,
      UserZSchema.createUserWithProfile
    );
    if (!success) return error;
    return data;
  }

  createUserAddressInput(
    payload: CreateUserAddressInputType
  ): CreateUserAddressInputType | z.ZodError {
    const { data, success, error } = this.validate(
      payload,
      UserZSchema.createAddress
    );
    if (!success) return error;
    return data;
  }

  createUserContactInput(
    payload: CreateUserContactInputType
  ): CreateUserContactInputType | z.ZodError {
    const { data, success, error } = this.validate(
      payload,
      UserZSchema.createContact
    );
    if (!success) return error;
    return data;
  }

  createUserEmailInput(
    payload: CreateUserEmailInputType
  ): CreateUserEmailInputType | z.ZodError {
    const { data, success, error } = this.validate(
      payload,
      UserZSchema.createEmail
    );
    if (!success) return error;
    return data;
  }

  createUserPhoneInput(
    payload: CreateUserPhoneInputType
  ): CreateUserPhoneInputType | z.ZodError {
    const { data, success, error } = this.validate(
      payload,
      UserZSchema.createPhone
    );
    if (!success) return error;
    return data;
  }

  verifyCodeInput(
    payload: VerifyCodeInputType
  ): VerifyCodeInputType | z.ZodError {
    const { data, success, error } = this.validate(
      payload,
      UserZSchema.verifyCode
    );
    if (!success) return error;
    return data;
  }

  verifyCodeWithUserId(
    payload: VerifyCodeWithUserIdInput
  ): VerifyCodeWithUserIdInput | z.ZodError {
    const { data, success, error } = this.validate(
      payload,
      UserZSchema.verifyCodeWithUserId
    );
    if (!success) return error;
    return data;
  }

  loginUserInput(payload: LoginUserInputType): LoginUserInputType | z.ZodError {
    const { data, success, error } = this.validate(
      payload,
      UserZSchema.loginUser
    );
    if (!success) return error;
    return data;
  }

  updateUserCoreInput(
    payload: UpdateUserInputType
  ): UpdateUserInputType | z.ZodError {
    const { data, success, error } = this.validate(
      payload,
      UserZSchema.updateUser
    );

    if (!success) return error;
    return data;
  }

  updateUserProfileInput(
    payload: UpdateProfileInputType
  ): UpdateProfileInputType | z.ZodError {
    const { data, success, error } = this.validate(
      payload,
      UserZSchema.updateProfile
    );

    if (!success) return error;

    return data;
  }

  updateUserPhoneInput(
    payload: UpdatePhoneInputType
  ): UpdatePhoneInputType | z.ZodError {
    const { data, success, error } = this.validate(
      payload,
      UserZSchema.updatePhone
    );

    if (!success) return error;

    return data;
  }

  updateUserEmailInput(
    payload: UpdateEmailInputType
  ): UpdateEmailInputType | z.ZodError {
    const { data, success, error } = this.validate(
      payload,
      UserZSchema.updateEmail
    );

    if (!success) return error;

    return data;
  }

  updateUserAddressInput(
    payload: UpdateAddressInputType
  ): UpdateAddressInputType | z.ZodError {
    const { data, success, error } = this.validate(
      payload,
      UserZSchema.updateAddress
    );

    if (!success) return error;

    return data;
  }

  updateUserContactInput(
    payload: UpdateContactInputType
  ): UpdateContactInputType | z.ZodError {
    const { data, success, error } = this.validate(
      payload,
      UserZSchema.updateContact
    );

    if (!success) return error;

    return data;
  }

  userIdWithContextIdInput(
    payload: UserIdWithContextIdInputType
  ): UserIdWithContextIdInputType | z.ZodError {
    const { data, success, error } = this.validate(
      payload,
      UserZSchema.userIdWithContextId
    );

    if (!success) return error;

    return data;
  }
}

export const userInputValidators = new UserInputValidators
