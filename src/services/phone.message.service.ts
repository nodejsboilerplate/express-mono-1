import { ApiError } from "@/libs";
import { TwilioService } from "./twilio.service";
import { getSystemCustomErrorMsgByKey } from "@/events";
import type { IPhoneMessageService } from "@/blueprints";
import type { UserIdWithContextIdInputType } from "@/zod";
import { UserInputValidators } from "@/validators/inputs";
import { UserRepository } from "@/database/repositories";
import {
  generateVerificationCode,
  getVerifyExpiry,
  isZodError,
  validationError,
} from "@/utils";

type PhoneMessagingServiceDepsType = {
  userInputValidators: UserInputValidators;
  userRepository: UserRepository;
};

export class PhoneMessagingService
  extends TwilioService
  implements IPhoneMessageService
{
  private userInputValidators: UserInputValidators;
  private userRepository: UserRepository;
  constructor({
    userInputValidators,
    userRepository,
  }: PhoneMessagingServiceDepsType) {
    super();
    this.userInputValidators = userInputValidators;
    this.userRepository = userRepository;
  }

  async sendContactPhoneVerificationCode(
    payload: UserIdWithContextIdInputType
  ) {
    const parse_payload =
      this.userInputValidators.userIdWithContextIdInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const verify_code = generateVerificationCode();
    const verify_expiry = getVerifyExpiry();

    // Here you throw error based on `.is_verified` instead of returning not found error
    // As `SetPhoneVerifyCode` is working with only if `.is_verified` is false
    // So if `.is_verified` is true it will throw not found error
    // You can throw phone already verified error by using `GetContactPhoneVerifyDetails` repository

    const result = await this.userRepository.SetPhoneVerifyCode(
      verify_code,
      verify_expiry,
      parse_payload.id,
      parse_payload.user_id
    );

    if (!result?.phone) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    const phone = result.phone_code + result.phone;

    const lookupRespose =
      await this.lookupWithCallerNameAndLineTypeIntelligence(phone);

    if (!lookupRespose.valid) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("INVALID_PHONE_NUMBER")
      );
    }

    const message_body = `Your verification code is ${verify_code}. This code will expire in 5 minutes. If you did not request this code, please ignore this message.`;

    await this.createMessage(phone, message_body);
  }
}
