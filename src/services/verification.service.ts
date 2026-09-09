import { UserRepository } from "@/database/repositories";
import { getSystemCustomErrorMsgByKey } from "@/events";
import { ApiError } from "@/libs";
import { isZodError, validationError } from "@/utils";
import { UserInputValidators } from "@/validators/inputs";
import type { VerifyCodeInputType, VerifyCodeWithUserIdInput } from "@/zod";
import type { UserService } from "./user.service";

type VerificationServiceDepsType = {
  userInputValidators: UserInputValidators;
  userRepository: UserRepository;
  userService: UserService;
};

export class VerificationService {
  private userInputValidators: UserInputValidators;
  private userRepository: UserRepository;
  private userService: UserService;

  constructor({
    userInputValidators,
    userRepository,
    userService,
  }: VerificationServiceDepsType) {
    this.userInputValidators = userInputValidators;
    this.userRepository = userRepository;
    this.userService = userService;
  }

  async verifySignupCode(payload: VerifyCodeInputType): Promise<string> {
    const parse_payload = this.userInputValidators.verifyCodeInput(payload);
    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const user = await this.userRepository.GetUserVerifyDetails(
      parse_payload.id
    );

    if (!user) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("USER_NOT_FOUND"));
    }

    if (user.is_verified) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("USER_ALREADY_VERIFIED")
      );
    }

    if (!user.verify_code || user.verify_code !== parse_payload.verify_code) {
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

    const verifiedUser = await this.userRepository.UpdateUserVerifyDetails(
      user.id
    );

    if (!verifiedUser?.id) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("USER_UPDATE_FAILED")
      );
    }

    return verifiedUser.id;
  }

  async verifyContactPhone(
    payload: VerifyCodeWithUserIdInput
  ): Promise<string> {
    const parse_payload =
      this.userInputValidators.verifyCodeWithUserId(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const user_phone = await this.userRepository.GetContactPhoneVerifyDetails(
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

    const result = await this.userService.updateUserPhone({
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
    const parse_payload =
      this.userInputValidators.verifyCodeWithUserId(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const user_email = await this.userRepository.GetContactEmailVerifyDetails(
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

    const result = await this.userService.updateUserEmail({
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
}
