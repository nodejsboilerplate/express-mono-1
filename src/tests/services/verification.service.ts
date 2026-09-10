import { describe, it, expect, vi, beforeEach } from "vitest";
import { VerificationService } from "@/services/verification.service";

const mocks = vi.hoisted(() => ({
  isZodError: vi.fn(),
  validationError: vi.fn(),
}));

vi.mock("@/utils", () => ({
  isZodError: mocks.isZodError,
  validationError: mocks.validationError,
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
    verifyCodeInput: vi.fn((p: unknown) => p),
    verifyCodeWithUserId: vi.fn((p: unknown) => p),
  },
  userRepository: {
    GetUserVerifyDetails: vi.fn(),
    UpdateUserVerifyDetails: vi.fn(),
    GetContactPhoneVerifyDetails: vi.fn(),
    GetContactEmailVerifyDetails: vi.fn(),
  },
  userService: {
    updateUserPhone: vi.fn(),
    updateUserEmail: vi.fn(),
  },
});

describe("VerificationService", () => {
  let deps: ReturnType<typeof buildDeps>;
  let verificationService: VerificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isZodError.mockReturnValue(false);
    deps = buildDeps();
    verificationService = new VerificationService(deps as any);
  });

  // -------------------------------------------------------
  describe("verifySignupCode", () => {
    const payload = { id: "u1", verify_code: "123456" };

    it("throws validation error on invalid payload", async () => {
      mocks.isZodError.mockReturnValueOnce(true);
      mocks.validationError.mockReturnValueOnce(
        ApiErrorLike(400, "VALIDATION_ERROR")
      );
      await expect(
        verificationService.verifySignupCode(payload as any)
      ).rejects.toThrow("VALIDATION_ERROR");
    });

    it("throws 404 when user not found", async () => {
      deps.userRepository.GetUserVerifyDetails.mockResolvedValueOnce(undefined);
      await expect(
        verificationService.verifySignupCode(payload as any)
      ).rejects.toThrow("USER_NOT_FOUND");
    });

    it("throws 400 when already verified", async () => {
      deps.userRepository.GetUserVerifyDetails.mockResolvedValueOnce({
        id: "u1",
        is_verified: true,
      });
      await expect(
        verificationService.verifySignupCode(payload as any)
      ).rejects.toThrow("USER_ALREADY_VERIFIED");
    });

    it("throws 400 on invalid verification code", async () => {
      deps.userRepository.GetUserVerifyDetails.mockResolvedValueOnce({
        id: "u1",
        is_verified: false,
        verify_code: "000000",
        verify_expiry: new Date(Date.now() + 60_000),
      });
      await expect(
        verificationService.verifySignupCode(payload as any)
      ).rejects.toThrow("INVALID_VERIFICATION_CODE");
    });

    it("throws 400 on expired verification code", async () => {
      deps.userRepository.GetUserVerifyDetails.mockResolvedValueOnce({
        id: "u1",
        is_verified: false,
        verify_code: "123456",
        verify_expiry: new Date(Date.now() - 60_000),
      });
      await expect(
        verificationService.verifySignupCode(payload as any)
      ).rejects.toThrow("VERIFICATION_CODE_EXPIRED");
    });

    it("throws 500 when the verification update fails", async () => {
      deps.userRepository.GetUserVerifyDetails.mockResolvedValueOnce({
        id: "u1",
        is_verified: false,
        verify_code: "123456",
        verify_expiry: new Date(Date.now() + 60_000),
      });
      deps.userRepository.UpdateUserVerifyDetails.mockResolvedValueOnce(
        undefined
      );
      await expect(
        verificationService.verifySignupCode(payload as any)
      ).rejects.toThrow("USER_UPDATE_FAILED");
    });

    it("verifies successfully and returns the verified user id", async () => {
      deps.userRepository.GetUserVerifyDetails.mockResolvedValueOnce({
        id: "u1",
        is_verified: false,
        verify_code: "123456",
        verify_expiry: new Date(Date.now() + 60_000),
      });
      deps.userRepository.UpdateUserVerifyDetails.mockResolvedValueOnce({
        id: "u1",
      });

      const result = await verificationService.verifySignupCode(payload as any);

      expect(deps.userRepository.UpdateUserVerifyDetails).toHaveBeenCalledWith(
        "u1"
      );
      expect(result).toBe("u1");
    });
  });

  // -------------------------------------------------------
  describe("verifyContactPhone", () => {
    const payload = { id: "ph1", user_id: "u1", verify_code: "123456" };

    it("throws 404 when phone not found", async () => {
      deps.userRepository.GetContactPhoneVerifyDetails.mockResolvedValueOnce(
        undefined
      );
      await expect(
        verificationService.verifyContactPhone(payload as any)
      ).rejects.toThrow("PHONE_NOT_FOUND");
    });

    it("throws 409 when already verified", async () => {
      deps.userRepository.GetContactPhoneVerifyDetails.mockResolvedValueOnce({
        is_verified: true,
      });
      await expect(
        verificationService.verifyContactPhone(payload as any)
      ).rejects.toThrow("PHONE_ALREADY_VERIFIED");
    });

    it("throws 400 on invalid code", async () => {
      deps.userRepository.GetContactPhoneVerifyDetails.mockResolvedValueOnce({
        is_verified: false,
        verify_code: "000000",
        verify_expiry: new Date(Date.now() + 60_000),
      });
      await expect(
        verificationService.verifyContactPhone(payload as any)
      ).rejects.toThrow("INVALID_VERIFICATION_CODE");
    });

    it("throws 400 on expired code", async () => {
      deps.userRepository.GetContactPhoneVerifyDetails.mockResolvedValueOnce({
        is_verified: false,
        verify_code: "123456",
        verify_expiry: new Date(Date.now() - 60_000),
      });
      await expect(
        verificationService.verifyContactPhone(payload as any)
      ).rejects.toThrow("VERIFICATION_CODE_EXPIRED");
    });

    it("throws 404 when the userService update returns falsy", async () => {
      deps.userRepository.GetContactPhoneVerifyDetails.mockResolvedValueOnce({
        is_verified: false,
        verify_code: "123456",
        verify_expiry: new Date(Date.now() + 60_000),
      });
      deps.userService.updateUserPhone.mockResolvedValueOnce(undefined);
      await expect(
        verificationService.verifyContactPhone(payload as any)
      ).rejects.toThrow("PHONE_NOT_FOUND");
    });

    it("verifies successfully via userService.updateUserPhone and returns the updated id", async () => {
      deps.userRepository.GetContactPhoneVerifyDetails.mockResolvedValueOnce({
        is_verified: false,
        verify_code: "123456",
        verify_expiry: new Date(Date.now() + 60_000),
      });
      deps.userService.updateUserPhone.mockResolvedValueOnce("ph1");

      const result = await verificationService.verifyContactPhone(
        payload as any
      );

      expect(deps.userService.updateUserPhone).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "ph1",
          user_id: "u1",
          is_verified: true,
          verify_code: null,
          verify_expiry: null,
        })
      );
      expect(result).toBe("ph1");
    });
  });

  // -------------------------------------------------------
  describe("verifyContactEmail", () => {
    const payload = { id: "em1", user_id: "u1", verify_code: "654321" };

    it("throws 404 when email not found", async () => {
      deps.userRepository.GetContactEmailVerifyDetails.mockResolvedValueOnce(
        undefined
      );
      await expect(
        verificationService.verifyContactEmail(payload as any)
      ).rejects.toThrow("EMAIL_NOT_FOUND");
    });

    it("throws 409 when already verified", async () => {
      deps.userRepository.GetContactEmailVerifyDetails.mockResolvedValueOnce({
        is_verified: true,
      });
      await expect(
        verificationService.verifyContactEmail(payload as any)
      ).rejects.toThrow("EMAIL_ALREADY_VERIFIED");
    });

    it("throws 400 on invalid code", async () => {
      deps.userRepository.GetContactEmailVerifyDetails.mockResolvedValueOnce({
        is_verified: false,
        verify_code: "000000",
        verify_expiry: new Date(Date.now() + 60_000),
      });
      await expect(
        verificationService.verifyContactEmail(payload as any)
      ).rejects.toThrow("INVALID_VERIFICATION_CODE");
    });

    it("throws 400 on expired code", async () => {
      deps.userRepository.GetContactEmailVerifyDetails.mockResolvedValueOnce({
        is_verified: false,
        verify_code: "654321",
        verify_expiry: new Date(Date.now() - 60_000),
      });
      await expect(
        verificationService.verifyContactEmail(payload as any)
      ).rejects.toThrow("VERIFICATION_CODE_EXPIRED");
    });

    it("throws 404 when the userService update returns falsy", async () => {
      deps.userRepository.GetContactEmailVerifyDetails.mockResolvedValueOnce({
        is_verified: false,
        verify_code: "654321",
        verify_expiry: new Date(Date.now() + 60_000),
      });
      deps.userService.updateUserEmail.mockResolvedValueOnce(undefined);
      await expect(
        verificationService.verifyContactEmail(payload as any)
      ).rejects.toThrow("EMAIL_NOT_FOUND");
    });

    it("verifies successfully via userService.updateUserEmail and returns the updated id", async () => {
      deps.userRepository.GetContactEmailVerifyDetails.mockResolvedValueOnce({
        is_verified: false,
        verify_code: "654321",
        verify_expiry: new Date(Date.now() + 60_000),
      });
      deps.userService.updateUserEmail.mockResolvedValueOnce("em1");

      const result = await verificationService.verifyContactEmail(
        payload as any
      );

      expect(deps.userService.updateUserEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "em1",
          user_id: "u1",
          is_verified: true,
          verify_code: null,
          verify_expiry: null,
        })
      );
      expect(result).toBe("em1");
    });
  });
});
