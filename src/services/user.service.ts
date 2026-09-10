import { UserRepository } from "@/database/repositories";
import { getSystemCustomErrorMsgByKey } from "@/events";
import { ApiError } from "@/libs";
import { isZodError, validationError } from "@/utils";
import { UserInputValidators } from "@/validators/inputs";
import type {
  CreateUserAddressInputType,
  CreateUserContactInputType,
  CreateUserEmailInputType,
  CreateUserPhoneInputType,
  CreateUserWithProfileByProviderInputType,
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

type UserServiceDepsType = {
  userInputValidators: UserInputValidators;
  userRepository: UserRepository;
};

export class UserService {
  private userInputValidators: UserInputValidators;
  private userRepository: UserRepository;

  constructor({ userInputValidators, userRepository }: UserServiceDepsType) {
    this.userInputValidators = userInputValidators;
    this.userRepository = userRepository;
  }
  // ---------------------------------------------------------
  // Create
  // ---------------------------------------------------------
  async createUserWithProfile(payload: CreateUserWithProfileInputType) {
    const parse_payload =
      this.userInputValidators.createUserWithProfileInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const existedUser = await this.userRepository.GetUserIdByEmail(
      parse_payload.user.email
    );
    if (existedUser?.id) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("USER_ALREADY_EXISTS")
      );
    }

    const result =
      await this.userRepository.CreateNewUserAndProfile(parse_payload);
    return result;
  }

  async createUserWithProfileByProvider(
    payload: CreateUserWithProfileByProviderInputType
  ) {
    const parse_payload =
      this.userInputValidators.createUserWithProfileByProviderInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const existedUser =
      await this.userRepository.GetUserDataForLoginByEmailOrUsernameOrId(
        parse_payload.user.email
      );

    if (existedUser?.id) {
      return existedUser;
    }

    const result =
      await this.userRepository.CreateNewUserAndProfileByProvider(
        parse_payload
      );
    return result;
  }

  async createUserAddress(
    payload: CreateUserAddressInputType
  ): Promise<string> {
    const parse_payload =
      this.userInputValidators.createUserAddressInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const createdUserAddress =
      await this.userRepository.CreateNewAddress(parse_payload);

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
    const parse_payload =
      this.userInputValidators.createUserContactInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const createdUserContact =
      await this.userRepository.CreateNewContact(parse_payload);

    if (!createdUserContact?.id) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("CONTACT_CREATION_FAILED")
      );
    }

    return createdUserContact?.id;
  }

  async createUserPhone(payload: CreateUserPhoneInputType): Promise<string> {
    const parse_payload =
      this.userInputValidators.createUserPhoneInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const createdUserPhone =
      await this.userRepository.CreateNewPhone(parse_payload);

    if (!createdUserPhone?.id) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("PHONE_CREATION_FAILED")
      );
    }

    return createdUserPhone.id;
  }

  async createUserEmail(payload: CreateUserEmailInputType): Promise<string> {
    const parse_payload =
      this.userInputValidators.createUserEmailInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const createdUserEmail =
      await this.userRepository.CreateNewEmail(parse_payload);
    if (!createdUserEmail?.id) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("EMAIL_CREATION_FAILED")
      );
    }

    return createdUserEmail.id;
  }
  // ---------------------------------------------------------
  // Read
  // ---------------------------------------------------------
  async getUserProfile(id: string) {
    const parse_id = this.userInputValidators.idInput(id);

    if (isZodError(parse_id)) throw validationError(parse_id);

    const result = await this.userRepository.GetAuthUserProfileById(parse_id);

    if (!result) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("USER_NOT_FOUND"));
    }

    return result;
  }
  // ---------------------------------------------------------
  // Update
  // ---------------------------------------------------------

  async updateUserProfile(payload: UpdateProfileInputType): Promise<string> {
    const parse_payload =
      this.userInputValidators.updateUserProfileInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const updatedProfile =
      await this.userRepository.UpdateUserProfile(parse_payload);

    if (!updatedProfile?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    return updatedProfile.id;
  }

  async updateUserContact(payload: UpdateContactInputType): Promise<string> {
    const parse_payload =
      this.userInputValidators.updateUserContactInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);
    const updatedContact =
      await this.userRepository.UpdateContact(parse_payload);

    if (!updatedContact?.id) {
      throw new ApiError(
        404,
        getSystemCustomErrorMsgByKey("CONTACT_NOT_FOUND")
      );
    }

    return updatedContact.id;
  }

  async updateUserPhone(payload: UpdatePhoneInputType): Promise<string> {
    const parse_payload =
      this.userInputValidators.updateUserPhoneInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);
    const updatedPhone =
      await this.userRepository.UpdateContactPhone(parse_payload);

    if (!updatedPhone?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    return updatedPhone.id;
  }

  async updateUserEmail(payload: UpdateEmailInputType): Promise<string> {
    const parse_payload =
      this.userInputValidators.updateUserEmailInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);
    const updatedEmail =
      await this.userRepository.UpdateContactEmail(parse_payload);

    if (!updatedEmail?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("EMAIL_NOT_FOUND"));
    }

    return updatedEmail.id;
  }

  async updateUserAddress(payload: UpdateAddressInputType): Promise<string> {
    const parse_payload =
      this.userInputValidators.updateUserAddressInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);
    const updatedAddress =
      await this.userRepository.UpdateAddress(parse_payload);

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
    const parse_id = this.userInputValidators.idInput(payload);

    if (isZodError(parse_id)) throw validationError(parse_id);

    const deletedUser = await this.userRepository.DeleteUserById(parse_id);

    if (!deletedUser?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("USER_NOT_FOUND"));
    }

    return deletedUser.id;
  }

  async deleteUserContact(
    payload: UserIdWithContextIdInputType
  ): Promise<string> {
    const parse_payload =
      this.userInputValidators.userIdWithContextIdInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);
    const { id, user_id } = parse_payload;

    const deletedContact = await this.userRepository.DeleteSingleContact(
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
    const parse_payload =
      this.userInputValidators.userIdWithContextIdInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);
    const { id, user_id } = parse_payload;

    const deletedPhone = await this.userRepository.DeleteSingleContactPhone(
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
    const parse_payload =
      this.userInputValidators.userIdWithContextIdInput(payload);
    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const { id, user_id } = parse_payload;
    const deletedEmail = await this.userRepository.DeleteSingleContactEmail(
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
    const parse_payload =
      this.userInputValidators.userIdWithContextIdInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);
    const { id, user_id } = parse_payload;

    const deletedAddress = await this.userRepository.DeleteSingleAddress(
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
