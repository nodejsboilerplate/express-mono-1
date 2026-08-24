import { validateWithZod } from "@/utils";
import {
  UserZSchema,
  type CreateUserAddressInputType,
  type CreateUserContactInputType,
  type CreateUserCoreInputType,
  type CreateUserEmailInputType,
  type CreateUserPhoneInputType,
  type CreateUserProfileInputType,
  type DeleteByUserWithContextIdInputType,
  type IdInputType,
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

interface UserInputValidatorsType {
  idInput(payload: IdInputType): IdInputType | z.ZodError;

  createUserCoreInput(
    payload: CreateUserCoreInputType
  ): CreateUserCoreInputType | z.ZodError;
  createUserAddressInput(
    payload: CreateUserAddressInputType
  ): CreateUserAddressInputType | z.ZodError;
  createUserContactInput(
    payload: CreateUserContactInputType
  ): CreateUserContactInputType | z.ZodError;
  createUserEmailInput(
    payload: CreateUserEmailInputType
  ): CreateUserEmailInputType | z.ZodError;
  createUserPhoneInput(
    payload: CreateUserPhoneInputType
  ): CreateUserPhoneInputType | z.ZodError;
  createUserProfileInput(
    payload: CreateUserProfileInputType
  ): CreateUserProfileInputType | z.ZodError;

  verifyCodeInput(
    payload: VerifyCodeInputType
  ): VerifyCodeInputType | z.ZodError;
  verifyCodeWithUserId(
    payload: VerifyCodeWithUserIdInput
  ): VerifyCodeWithUserIdInput | z.ZodError;

  updateUserCoreInput(
    payload: UpdateUserInputType
  ): UpdateUserInputType | z.ZodError;
  updateUserProfileInput(
    payload: UpdateProfileInputType
  ): UpdateProfileInputType | z.ZodError;
  updateUserPhoneInput(
    payload: UpdatePhoneInputType
  ): UpdatePhoneInputType | z.ZodError;
  updateUserEmailInput(
    payload: UpdateEmailInputType
  ): UpdateEmailInputType | z.ZodError;
  updateUserAddressInput(
    payload: UpdateAddressInputType
  ): UpdateAddressInputType | z.ZodError;
  updateUserContactInput(
    payload: UpdateContactInputType
  ): UpdateContactInputType | z.ZodError;

  deleteByUserIdWithContextIdInput(
    payload: DeleteByUserWithContextIdInputType
  ): DeleteByUserWithContextIdInputType | z.ZodError;
}

export class UserInputValidators implements UserInputValidatorsType {
  idInput(payload: IdInputType): IdInputType | z.ZodError {
    const { data, success, error } = validateWithZod(payload, UserZSchema.id);

    if (!success) {
      return error;
    }
    return data;
  }

  createUserCoreInput(
    payload: CreateUserCoreInputType
  ): CreateUserCoreInputType | z.ZodError {
    const { data, success, error } = validateWithZod(
      payload,
      UserZSchema.createUser
    );
    if (!success) return error;
    return data;
  }

  createUserAddressInput(
    payload: CreateUserAddressInputType
  ): CreateUserAddressInputType | z.ZodError {
    const { data, success, error } = validateWithZod(
      payload,
      UserZSchema.createAddress
    );
    if (!success) return error;
    return data;
  }

  createUserContactInput(
    payload: CreateUserContactInputType
  ): CreateUserContactInputType | z.ZodError {
    const { data, success, error } = validateWithZod(
      payload,
      UserZSchema.createContact
    );
    if (!success) return error;
    return data;
  }

  createUserEmailInput(
    payload: CreateUserEmailInputType
  ): CreateUserEmailInputType | z.ZodError {
    const { data, success, error } = validateWithZod(
      payload,
      UserZSchema.createEmail
    );
    if (!success) return error;
    return data;
  }

  createUserPhoneInput(
    payload: CreateUserPhoneInputType
  ): CreateUserPhoneInputType | z.ZodError {
    const { data, success, error } = validateWithZod(
      payload,
      UserZSchema.createPhone
    );
    if (!success) return error;
    return data;
  }

  createUserProfileInput(
    payload: CreateUserProfileInputType
  ): CreateUserProfileInputType | z.ZodError {
    const { data, success, error } = validateWithZod(
      payload,
      UserZSchema.createProfile
    );
    if (!success) return error;
    return data;
  }

  verifyCodeInput(
    payload: VerifyCodeInputType
  ): VerifyCodeInputType | z.ZodError {
    const { data, success, error } = validateWithZod(
      payload,
      UserZSchema.verifyCode
    );
    if (!success) return error;
    return data;
  }

  verifyCodeWithUserId(
    payload: VerifyCodeWithUserIdInput
  ): VerifyCodeWithUserIdInput | z.ZodError {
    const { data, success, error } = validateWithZod(
      payload,
      UserZSchema.verifyCodeWithUserId
    );
    if (!success) return error;
    return data;
  }

  updateUserCoreInput(
    payload: UpdateUserInputType
  ): UpdateUserInputType | z.ZodError {
    const { data, success, error } = validateWithZod(
      payload,
      UserZSchema.updateUser
    );

    if (!success) return error;
    return data;
  }

  updateUserProfileInput(
    payload: UpdateProfileInputType
  ): UpdateProfileInputType | z.ZodError {
    const { data, success, error } = validateWithZod(
      payload,
      UserZSchema.updateProfile
    );

    if (!success) return error;

    return data;
  }

  updateUserPhoneInput(
    payload: UpdatePhoneInputType
  ): UpdatePhoneInputType | z.ZodError {
    const { data, success, error } = validateWithZod(
      payload,
      UserZSchema.updatePhone
    );

    if (!success) return error;

    return data;
  }

  updateUserEmailInput(
    payload: UpdateEmailInputType
  ): UpdateEmailInputType | z.ZodError {
    const { data, success, error } = validateWithZod(
      payload,
      UserZSchema.updateEmail
    );

    if (!success) return error;

    return data;
  }

  updateUserAddressInput(
    payload: UpdateAddressInputType
  ): UpdateAddressInputType | z.ZodError {
    const { data, success, error } = validateWithZod(
      payload,
      UserZSchema.updateAddress
    );

    if (!success) return error;

    return data;
  }

  updateUserContactInput(
    payload: UpdateContactInputType
  ): UpdateContactInputType | z.ZodError {
    const { data, success, error } = validateWithZod(
      payload,
      UserZSchema.updateContact
    );

    if (!success) return error;

    return data;
  }

  deleteByUserIdWithContextIdInput(
    payload: DeleteByUserWithContextIdInputType
  ): DeleteByUserWithContextIdInputType | z.ZodError {
    const { data, success, error } = validateWithZod(
      payload,
      UserZSchema.deleteByUserWithContextId
    );

    if (!success) return error;

    return data;
  }
}
