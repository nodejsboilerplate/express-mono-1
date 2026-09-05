import { UserRepository } from "@/database/repositories";
import type { UserProfileSelectType, UserSelectType } from "@/database/type";
import { getSystemCustomErrorMsgByKey } from "@/events";
import { ApiError } from "@/libs";
import {
  generateVerificationCode,
  getVerifyExpiry,
  isZodError,
  validationError,
} from "@/utils";
import { UserInputValidators } from "@/validators/inputs";
import type {
  CreateUserAddressInputType,
  CreateUserContactInputType,
  CreateUserEmailInputType,
  CreateUserPhoneInputType,
  CreateUserWithProfileByProviderInputType,
  CreateUserWithProfileInputType,
  EmailZType,
  IdZType,
  UpdateAddressInputType,
  UpdateContactInputType,
  UpdateEmailInputType,
  UpdatePhoneInputType,
  UpdateProfileInputType,
  UserCoreZType,
  UserIdWithContextIdInputType,
  UserZSchema,
  VerifyCodeWithUserIdInput,
} from "@/zod";

const userRepository = new UserRepository();
const userInputValidators = new UserInputValidators();

export class UserService {
  // ---------------------------------------------------------
  // Create
  // ---------------------------------------------------------
  async createUserWithProfile(payload: CreateUserWithProfileInputType) {
    const parse_payload =
      userInputValidators.createUserWithProfileInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const existedUser = await userRepository.GetUserIdByEmail(
      parse_payload.user.email
    );
    if (existedUser?.id) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("USER_ALREADY_EXISTS")
      );
    }

    const result = await userRepository.CreateNewUserAndProfile(parse_payload);
    return result;
  }

  async createUserWithProfileByProvider(
    payload: CreateUserWithProfileByProviderInputType
  ) {
    const parse_payload =
      userInputValidators.createUserWithProfileByProviderInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const existedUser =
      await userRepository.GetUserDataForLoginByEmailOrUsername(
        parse_payload.user.email
      );

    if (existedUser?.id) {
      return existedUser;
    }

    const result =
      await userRepository.CreateNewUserAndProfileByProvider(parse_payload);
    return result;
  }

  async createUserAddress(
    payload: CreateUserAddressInputType
  ): Promise<string> {
    const parse_payload = userInputValidators.createUserAddressInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const createdUserAddress =
      await userRepository.CreateNewAddress(parse_payload);

    if (!createdUserAddress?.id) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("ADDRESS_CREATION_FAILED")
      );
    }

    return createdUserAddress?.id;
  }

  async createUserContact(
    payload: CreateUserContactInputType
  ): Promise<string> {
    const parse_payload = userInputValidators.createUserContactInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const createdUserContact =
      await userRepository.CreateNewContact(parse_payload);

    if (!createdUserContact?.id) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("CONTACT_CREATION_FAILED")
      );
    }

    return createdUserContact?.id;
  }

  async createUserPhone(payload: CreateUserPhoneInputType): Promise<string> {
    const parse_payload = userInputValidators.createUserPhoneInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const createdUserPhone = await userRepository.CreateNewPhone(parse_payload);

    if (!createdUserPhone?.id) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("PHONE_CREATION_FAILED")
      );
    }

    return createdUserPhone.id;
  }

  async createUserEmail(payload: CreateUserEmailInputType): Promise<string> {
    const parse_payload = userInputValidators.createUserEmailInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const createdUserEmail = await userRepository.CreateNewEmail(parse_payload);
    if (!createdUserEmail?.id) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("EMAIL_CREATION_FAILED")
      );
    }

    return createdUserEmail.id;
  }

  // ---------------------------------------------------------
  // Send Verification Code
  // ---------------------------------------------------------

  async sendVerificationCodeForPhone(
    payload: UserIdWithContextIdInputType
  ): Promise<string> {
    const parse_payload = userInputValidators.userIdWithContextIdInput(payload);
    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const verify_code = generateVerificationCode();
    const verify_expiry = getVerifyExpiry();

    const phone = await userRepository.SetPhoneVerifyCode(
      verify_code,
      verify_expiry,
      parse_payload.id,
      parse_payload.user_id
    );

    if (!phone) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    return phone.id;
  }

  async sendVerificationCodeForEmail(
    payload: UserIdWithContextIdInputType
  ): Promise<string> {
    const parse_payload = userInputValidators.userIdWithContextIdInput(payload);
    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const verify_code = generateVerificationCode();
    const verify_expiry = getVerifyExpiry();

    const email = await userRepository.SetEmailVerifyCode(
      verify_code,
      verify_expiry,
      parse_payload.id,
      parse_payload.user_id
    );

    if (!email) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("EMAIL_NOT_FOUND"));
    }

    return email.id;
  }

  // ---------------------------------------------------------
  // Verifications
  // ---------------------------------------------------------

  async verifyContactPhone(
    payload: VerifyCodeWithUserIdInput
  ): Promise<string> {
    const parse_payload = userInputValidators.verifyCodeWithUserId(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const user_phone = await userRepository.GetContactPhoneVerifyDetails(
      parse_payload.id
    );

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
      user_phone.verify_code !== parse_payload.verify_code
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

    const result = await this.updateUserPhone({
      ...parse_payload,
      is_verified: true,
      verify_code: null,
      verify_expiry: null,
    });

    if (!result) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    return result;
  }

  async verifyContactEmail(
    payload: VerifyCodeWithUserIdInput
  ): Promise<string> {
    const parse_payload = userInputValidators.verifyCodeWithUserId(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const user_email = await userRepository.GetContactEmailVerifyDetails(
      parse_payload.id
    );

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
      user_email.verify_code !== parse_payload.verify_code
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

    const result = await this.updateUserEmail({
      ...parse_payload,
      is_verified: true,
      verify_code: null,
      verify_expiry: null,
    });

    if (!result) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("EMAIL_NOT_FOUND"));
    }

    return result;
  }

  async getUserProfile(id: string) {
    const parse_id = userInputValidators.idInput(id);

    if (isZodError(parse_id)) throw validationError(parse_id);

    const result = await userRepository.GetAuthUserProfileById(parse_id);

    if (!result) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("USER_NOT_FOUND"));
    }

    return result;
  }
  // ---------------------------------------------------------
  // Update
  // ---------------------------------------------------------

  async updateUserProfile(payload: UpdateProfileInputType): Promise<string> {
    const parse_payload = userInputValidators.updateUserProfileInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const updatedProfile =
      await userRepository.UpdateUserProfile(parse_payload);

    if (!updatedProfile?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    return updatedProfile.id;
  }

  async updateUserContact(payload: UpdateContactInputType): Promise<string> {
    const parse_payload = userInputValidators.updateUserContactInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);
    const updatedContact = await userRepository.UpdateContact(parse_payload);

    if (!updatedContact?.id) {
      throw new ApiError(
        404,
        getSystemCustomErrorMsgByKey("CONTACT_NOT_FOUND")
      );
    }

    return updatedContact.id;
  }

  async updateUserPhone(payload: UpdatePhoneInputType): Promise<string> {
    const parse_payload = userInputValidators.updateUserPhoneInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);
    const updatedPhone = await userRepository.UpdateContactPhone(parse_payload);

    if (!updatedPhone?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    return updatedPhone.id;
  }

  async updateUserEmail(payload: UpdateEmailInputType): Promise<string> {
    const parse_payload = userInputValidators.updateUserEmailInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);
    const updatedEmail = await userRepository.UpdateContactEmail(parse_payload);

    if (!updatedEmail?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("EMAIL_NOT_FOUND"));
    }

    return updatedEmail.id;
  }

  async updateUserAddress(payload: UpdateAddressInputType): Promise<string> {
    const parse_payload = userInputValidators.updateUserAddressInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);
    const updatedAddress = await userRepository.UpdateAddress(parse_payload);

    if (!updatedAddress?.id) {
      throw new ApiError(
        404,
        getSystemCustomErrorMsgByKey("ADDRESS_NOT_FOUND")
      );
    }

    return updatedAddress.id;
  }

  // ---------------------------------------------------------
  // Delete
  // ---------------------------------------------------------

  async deleteUser(payload: IdZType): Promise<string> {
    const parse_id = userInputValidators.idInput(payload);

    if (isZodError(parse_id)) throw validationError(parse_id);

    const deletedUser = await userRepository.DeleteUserById(parse_id);

    if (!deletedUser?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("USER_NOT_FOUND"));
    }

    return deletedUser.id;
  }

  async deleteUserContact(
    payload: UserIdWithContextIdInputType
  ): Promise<string> {
    const parse_payload = userInputValidators.userIdWithContextIdInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);
    const { id, user_id } = parse_payload;

    const deletedContact = await userRepository.DeleteSingleContact(
      id,
      user_id
    );

    if (!deletedContact?.id) {
      throw new ApiError(
        404,
        getSystemCustomErrorMsgByKey("CONTACT_NOT_FOUND")
      );
    }

    return deletedContact.id;
  }

  async deleteUserPhone(
    payload: UserIdWithContextIdInputType
  ): Promise<string> {
    const parse_payload = userInputValidators.userIdWithContextIdInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);
    const { id, user_id } = parse_payload;

    const deletedPhone = await userRepository.DeleteSingleContactPhone(
      id,
      user_id
    );

    if (!deletedPhone?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    return deletedPhone.id;
  }

  async deleteUserEmail(
    payload: UserIdWithContextIdInputType
  ): Promise<string> {
    const parse_payload = userInputValidators.userIdWithContextIdInput(payload);
    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const { id, user_id } = parse_payload;
    const deletedEmail = await userRepository.DeleteSingleContactEmail(
      id,
      user_id
    );

    if (!deletedEmail?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("EMAIL_NOT_FOUND"));
    }

    return deletedEmail.id;
  }

  async deleteUserAddress(
    payload: UserIdWithContextIdInputType
  ): Promise<string> {
    const parse_payload = userInputValidators.userIdWithContextIdInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);
    const { id, user_id } = parse_payload;

    const deletedAddress = await userRepository.DeleteSingleAddress(
      id,
      user_id
    );

    if (!deletedAddress?.id) {
      throw new ApiError(
        404,
        getSystemCustomErrorMsgByKey("ADDRESS_NOT_FOUND")
      );
    }

    return deletedAddress.id;
  }
}
