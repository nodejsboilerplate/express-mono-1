import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmailService } from "@/services";

// ---------------------------------------------------------
// Hoisted shared mock fns
// ---------------------------------------------------------
const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  otpVerificationEmail2: vi.fn((props: unknown) => ({ __reactMarkup: props })),
}));

vi.mock("./resend.service", () => ({
  ResendService: class {
    static resend = { emails: { send: mocks.send } };
    static TEAM_NAME = "My Team";
    static APP_LOGO_URL = "https://cdn.test/logo.png";
    static EMAIL_DOMAIN = "fluctux.com";
    static EMAIL_ADDRESS_FOR_AUTH = "auth";
    static EMAIL_ADDRESS_FOR_VERIFICATION = "verify";

    static GetFullEmail(title: string, address: string) {
      return `${title} <${address}@${this.EMAIL_DOMAIN}>`;
    }
  },
}));

vi.mock("@repo/emails", () => ({
  OtpVerificationEmail2: mocks.otpVerificationEmail2,
}));

describe("EmailService", () => {
  let emailService: EmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    emailService = new EmailService();
  });

  // -------------------------------------------------------
  describe("sendSignupCode", () => {
    it("sends a signup verification email from the auth address", async () => {
      await emailService.sendSignupCode("a@b.com", "123456", "Chrome on macOS");

      expect(mocks.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "Signup <auth@fluctux.com>",
          to: "a@b.com",
          subject: "Verify Your Account",
        })
      );
      expect(mocks.otpVerificationEmail2).toHaveBeenCalledWith(
        expect.objectContaining({
          appLogoUrl: "https://cdn.test/logo.png",
          deviceInfo: "Chrome on macOS",
          otp: "123456",
          teamName: "My Team",
          requestDate: expect.any(String),
        })
      );
    });
  });

  // -------------------------------------------------------
  describe("sendLoginCode", () => {
    it("sends a login verification email from the auth address", async () => {
      await emailService.sendLoginCode("a@b.com", "654321", "Safari on iOS");

      expect(mocks.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "Signup <auth@fluctux.com>",
          to: "a@b.com",
          subject: "Your Login Verification Code",
        })
      );
      expect(mocks.otpVerificationEmail2).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceInfo: "Safari on iOS",
          otp: "654321",
        })
      );
    });
  });

  // -------------------------------------------------------
  describe("sendContactEmailVerificationCode", () => {
    it("sends a contact-email verification message from the verification address", async () => {
      await emailService.sendContactEmailVerificationCode(
        "new@b.com",
        "999999",
        "Firefox on Linux"
      );

      expect(mocks.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "Email Verification <verify@fluctux.com>",
          to: "new@b.com",
          subject: "Verify Your New Email",
        })
      );
      expect(mocks.otpVerificationEmail2).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceInfo: "Firefox on Linux",
          otp: "999999",
        })
      );
    });
  });

  // -------------------------------------------------------
  it("does not throw when EmailService.resend is null (optional chaining guard)", async () => {
    // Simulate resend client not being configured
    (EmailService as any).resend = null;

    await expect(
      emailService.sendSignupCode("a@b.com", "111111", "device")
    ).resolves.not.toThrow();

    expect(mocks.send).not.toHaveBeenCalled();
  });
});
