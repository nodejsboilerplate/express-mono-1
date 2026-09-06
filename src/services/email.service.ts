import { ResendService } from "./resend.service";
import { OtpVerificationEmail2 } from "@repo/emails";

export class EmailService extends ResendService {
  async sendSignupCode(email: string, verify_code: string, deviceInfo: string) {
    await EmailService.resend?.emails.send({
      from: EmailService.GetFullEmail(
        "Signup",
        EmailService.EMAIL_ADDRESS_FOR_AUTH
      ),
      to: email,
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

  async sendLoginCode(email: string, verify_code: string, deviceInfo: string) {
    await EmailService.resend?.emails.send({
      from: EmailService.GetFullEmail(
        "Signup",
        EmailService.EMAIL_ADDRESS_FOR_AUTH
      ),
      to: email,
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
    email: string,
    verify_code: string,
    deviceInfo: string
  ) {
    await EmailService.resend?.emails.send({
      from: EmailService.GetFullEmail(
        "Email Verification",
        EmailService.EMAIL_ADDRESS_FOR_VERIFICATION
      ),
      to: email,
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
