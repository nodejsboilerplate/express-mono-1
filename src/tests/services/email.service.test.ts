import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmailService } from "@/services";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  otpVerificationEmail2: vi.fn((props: unknown) => ({ __reactMarkup: props })),
  isZodError: vi.fn(),
  validationError: vi.fn(),
  generateVerificationCode: vi.fn(),
  getVerifyExpiry: vi.fn(),
}));

vi.mock("@/services/resend.service", () => ({
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

vi.mock("@/utils", () => ({
  isZodError: mocks.isZodError,
  validationError: mocks.validationError,
  generateVerificationCode: mocks.generateVerificationCode,
  getVerifyExpiry: mocks.getVerifyExpiry,
}));

vi.mock("@/events", () => ({
  getSystemCustomErrorMsgByKey: (key: string) => key,
}));

vi.mock("@/libs", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const ApiErrorLike = (status: number, message: string) => {
  const e: any = new Error(message);
  e.status = status;
  return e;
};

const buildDeps = () => ({
  userInputValidators: {
    emailInput: vi.fn((p: unknown) => p),
    userIdWithContextIdInput: vi.fn((p: unknown) => p),
  },
  userRepository: {
    GetUserDataForLoginByEmailOrUsernameOrId: vi.fn(),
    SetVerifyCodeForCoreUser: vi.fn(),
    SetEmailVerifyCode: vi.fn(),
  },
});

describe("EmailService", () => {
  let deps: ReturnType<typeof buildDeps>;
  let emailService: EmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isZodError.mockReturnValue(false);
    mocks.generateVerificationCode.mockReturnValue("123456");
    mocks.getVerifyExpiry.mockReturnValue(new Date(Date.now() + 5 * 60_000));
    deps = buildDeps();
    emailService = new EmailService(deps as any);
  });

  // -------------------------------------------------------
  describe("sendSignupCode", () => {
    it("throws validation error for an invalid email", async () => {
      mocks.isZodError.mockReturnValueOnce(true);
      mocks.validationError.mockReturnValueOnce(
        ApiErrorLike(400, "INVALID_EMAIL")
      );
      await expect(
        emailService.sendSignupCode("bad-email", "device")
      ).rejects.toThrow("INVALID_EMAIL");
      expect(mocks.send).not.toHaveBeenCalled();
    });

    it("throws 404 when no matching user exists", async () => {
      deps.userRepository.GetUserDataForLoginByEmailOrUsernameOrId.mockResolvedValueOnce(
        undefined
      );
      await expect(
        emailService.sendSignupCode("a@b.com", "device")
      ).rejects.toThrow("USER_NOT_FOUND");
    });

    it("throws 400 when the user is already verified", async () => {
      deps.userRepository.GetUserDataForLoginByEmailOrUsernameOrId.mockResolvedValueOnce(
        {
          id: "u1",
          email: "a@b.com",
          is_verified: true,
        }
      );
      await expect(
        emailService.sendSignupCode("a@b.com", "device")
      ).rejects.toThrow("USER_ALREADY_VERIFIED");
    });

    it("throws 404 when setting the verify code fails", async () => {
      deps.userRepository.GetUserDataForLoginByEmailOrUsernameOrId.mockResolvedValueOnce(
        {
          id: "u1",
          email: "a@b.com",
          is_verified: false,
        }
      );
      deps.userRepository.SetVerifyCodeForCoreUser.mockResolvedValueOnce(
        undefined
      );
      await expect(
        emailService.sendSignupCode("a@b.com", "device")
      ).rejects.toThrow("USER_NOT_FOUND");
    });

    it("sends a signup verification email from the auth address on success", async () => {
      deps.userRepository.GetUserDataForLoginByEmailOrUsernameOrId.mockResolvedValueOnce(
        {
          id: "u1",
          email: "a@b.com",
          is_verified: false,
        }
      );
      deps.userRepository.SetVerifyCodeForCoreUser.mockResolvedValueOnce({
        id: "u1",
      });

      await emailService.sendSignupCode("a@b.com", "Chrome on macOS");

      expect(deps.userRepository.SetVerifyCodeForCoreUser).toHaveBeenCalledWith(
        "123456",
        expect.any(Date),
        "a@b.com"
      );
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
  describe("sendContactEmailVerificationCode", () => {
    const payload = { id: "em1", user_id: "u1" };

    it("throws 404 when the email row can't be found/updated", async () => {
      deps.userRepository.SetEmailVerifyCode.mockResolvedValueOnce(undefined);
      await expect(
        emailService.sendContactEmailVerificationCode(payload as any, "device")
      ).rejects.toThrow("EMAIL_NOT_FOUND");
      expect(mocks.send).not.toHaveBeenCalled();
    });

    it("sends a verification message from the verification address on success", async () => {
      deps.userRepository.SetEmailVerifyCode.mockResolvedValueOnce({
        id: "em1",
        email: "new@b.com",
      });

      await emailService.sendContactEmailVerificationCode(
        payload as any,
        "Firefox on Linux"
      );

      expect(deps.userRepository.SetEmailVerifyCode).toHaveBeenCalledWith(
        "123456",
        expect.any(Date),
        "em1",
        "u1"
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
          otp: "123456",
        })
      );
    });
  });
});
