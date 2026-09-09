import type { IEmailService } from "@/blueprints";
import { ResendService } from "./resend.service";
import { OtpVerificationEmail2 } from "@repo/emails";
import {
  generateVerificationCode,
  getVerifyExpiry,
  isZodError,
  validationError,
} from "@/utils";
import { ApiError } from "@/libs";
import { getSystemCustomErrorMsgByKey } from "@/events";
import { UserInputValidators } from "@/validators/inputs";
import { UserRepository } from "@/database/repositories";
import type { UserIdWithContextIdInputType } from "@/zod";

type EmailServiceDepsType = {
  userInputValidators: UserInputValidators;
  userRepository: UserRepository;
};

export class EmailService extends ResendService implements IEmailService {
  private userInputValidators: UserInputValidators;
  private userRepository: UserRepository;

  constructor({ userInputValidators, userRepository }: EmailServiceDepsType) {
    super();
    this.userInputValidators = userInputValidators;
    this.userRepository = userRepository;
  }

  async sendSignupCode(email: string, deviceInfo: string) {
    const parse_email = this.userInputValidators.emailInput(email);

    if (isZodError(parse_email)) throw validationError(parse_email);

    const verify_code = generateVerificationCode();
    const verify_expiry = getVerifyExpiry();

    const existedUser =
      await this.userRepository.GetUserDataForLoginByEmailOrUsernameOrId(
        parse_email
      );

    if (!existedUser?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("USER_NOT_FOUND"));
    }

    if (existedUser.is_verified) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("USER_ALREADY_VERIFIED")
      );
    }

    const user = await this.userRepository.SetVerifyCodeForCoreUser(
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
      to: existedUser.email,
      subject: "Verify Your Account",
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
  }

  async sendLoginCode(email: string, deviceInfo: string) {
    const parse_email = this.userInputValidators.emailInput(email);

    if (isZodError(parse_email)) throw validationError(parse_email);

    const verify_code = generateVerificationCode();
    const verify_expiry = getVerifyExpiry();

    const existedUser =
      await this.userRepository.GetUserDataForLoginByEmailOrUsernameOrId(
        parse_email
      );

    if (!existedUser?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("USER_NOT_FOUND"));
    }

    if (!existedUser.is_verified) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("USER_NOT_VERIFIED")
      );
    }

    const user = await this.userRepository.SetVerifyCodeForCoreUser(
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
      to: existedUser.email,
      subject: "Your Login Verification Code",
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
  }

  // For verifing contact's individual emails
  async sendContactEmailVerificationCode(
    payload: UserIdWithContextIdInputType,
    deviceInfo: string
  ) {
    const parse_payload =
      this.userInputValidators.userIdWithContextIdInput(payload);
    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const verify_code = generateVerificationCode();
    const verify_expiry = getVerifyExpiry();

    const result = await this.userRepository.SetEmailVerifyCode(
      verify_code,
      verify_expiry,
      parse_payload.id,
      parse_payload.user_id
    );

    if (!result?.email) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("EMAIL_NOT_FOUND"));
    }

    await EmailService.resend?.emails.send({
      from: EmailService.GetFullEmail(
        "Email Verification",
        EmailService.EMAIL_ADDRESS_FOR_VERIFICATION
      ),
      to: result.email,
      subject: "Verify Your New Email",
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
  }
}
