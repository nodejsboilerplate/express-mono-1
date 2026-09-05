import { UserRepository } from "@/database/repositories";
import { ResendService } from "./resend.service";
import { OtpVerificationEmail2 } from "@repo/emails";
import {
  generateVerificationCode,
  getVerifyExpiry,
  isZodError,
  validationError,
} from "@/utils";
import { UserInputValidators } from "@/validators/inputs";
import { ApiError } from "@/libs";
import { getSystemCustomErrorMsgByKey } from "@/events";

const userRepository = new UserRepository();
const userInputValidators = new UserInputValidators();

export class EmailService extends ResendService {
  async sendSignupCode(email: string, deviceInfo: string) {
    const parse_email = userInputValidators.emailInput(email);

    if (isZodError(parse_email)) throw validationError(parse_email);

    const verify_code = generateVerificationCode();
    const verify_expiry = getVerifyExpiry();

    const user = await userRepository.SetVerifyCodeForSignup(
      verify_code,
      verify_expiry,
      email
    );

    if (!user?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("USER_NOT_FOUND"));
    }

    await EmailService.resend?.emails.send({
      from: EmailService.GetFullEmail(
        "Signup",
        EmailService.EMAIL_ADDRESS_FOR_AUTH
      ),
      to: email,
      subject: "Verify your email",
      react: OtpVerificationEmail2({
        appLogoUrl: EmailService.APP_LOGO_URL,
        deviceInfo,
        otp: verify_code,
        requestDate: new Date().toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
        teamName: EmailService.TEAM_NAME,
      }),
    });

    return user.id;
  }
}
