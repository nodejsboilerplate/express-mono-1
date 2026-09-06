import { ApiError } from "@/libs";
import { TwilioService } from "./twilio.service";
import { getSystemCustomErrorMsgByKey } from "@/events";

export class PhoneMessagingService extends TwilioService {
  async sendContactPhoneVerification(phone: string, verify_code: string) {
    const lookupRespose =
      await this.lookupWithCallerNameAndLineTypeIntelligence(phone);

    if (!lookupRespose.valid) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("INVALID_PHONE_NUMBER")
      );
    }

    const message_body = `Your verification code is ${verify_code}. This code will expire in 5 minutes. If you did not request this code, please ignore this message.`;

    const messageResponse = await this.createMessage(phone, message_body);
    return {
      lookupRespose,
      messageResponse,
    };
  }
}
