import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageController } from "@/controllers/message.contoller";
import { AUTH_USER } from "../helper";

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
  ApiResponse: class ApiResponse {
    status: number;
    message: string;
    data: unknown;
    constructor(status: number, message: string, data?: unknown) {
      this.status = status;
      this.message = message;
      this.data = data;
    }
  },
}));

const buildRes = () => {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.cookie = vi.fn(() => res);
  res.redirect = vi.fn(() => res);
  return res;
};

const buildDeps = () => ({
  verificationService: {
    verifySignupCode: vi.fn(),
    verifyContactPhone: vi.fn(),
    verifyContactEmail: vi.fn(),
  },
  emailService: {
    sendSignupCode: vi.fn(),
    sendContactEmailVerificationCode: vi.fn(),
  },

  phoneService: {
    sendContactPhoneVerificationCode: vi.fn(),
  },
});

describe("MessageController", () => {
  let deps: ReturnType<typeof buildDeps>;
  let messageController: MessageController;
  let res: ReturnType<typeof buildRes>;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = buildDeps();
    messageController = new MessageController(deps as any);
    res = buildRes();
  });

  // -------------------------------------------------------
  describe("verifySignupCodeHandler", () => {
    it("throws 400 when the user is already verified", async () => {
      const req: any = {
        body: { verify_code: "123456" },
        auth_user: { id: "u1", is_verified: true },
      };

      await expect(
        messageController.verifySignupCodeHandler(req, res)
      ).rejects.toThrow("USER_ALREADY_VERIFIED");
      expect(deps.verificationService.verifySignupCode).not.toHaveBeenCalled();
    });

    it("verifies the code and returns the verified user id", async () => {
      deps.verificationService.verifySignupCode.mockResolvedValueOnce("u1");
      const req: any = {
        body: { verify_code: "123456" },
        auth_user: { id: "u1", is_verified: false },
      };

      const result = await messageController.verifySignupCodeHandler(req, res);

      expect(deps.verificationService.verifySignupCode).toHaveBeenCalledWith({
        verify_code: "123456",
        id: "u1",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          message: "Account verified successfully.",
          data: { id: "u1" },
        })
      );
      expect(result).toBe(res);
    });
  });

  describe("sendContactPhoneVerificationHandler", () => {
    it("delegates to phoneService with contact id + user id", async () => {
      deps.phoneService.sendContactPhoneVerificationCode.mockResolvedValueOnce(
        undefined
      );
      const req: any = { params: { id: "ph1" }, auth_user: AUTH_USER };

      await messageController.sendContactPhoneVerificationHandler(req, res);

      expect(
        deps.phoneService.sendContactPhoneVerificationCode
      ).toHaveBeenCalledWith({
        id: "ph1",
        user_id: "u1",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Verification code sent successfully.",
          data: { id: undefined },
        })
      );
    });
  });

  describe("sendContactEmailVerificationHandler", () => {
    it("delegates to emailService with contact id, user id, and device info", async () => {
      deps.emailService.sendContactEmailVerificationCode.mockResolvedValueOnce(
        undefined
      );
      const req: any = {
        params: { id: "em1" },
        auth_user: AUTH_USER,
        headers: { "user-agent": "Chrome" },
      };

      await messageController.sendContactEmailVerificationHandler(req, res);

      expect(
        deps.emailService.sendContactEmailVerificationCode
      ).toHaveBeenCalledWith({ id: "em1", user_id: "u1" }, "Chrome");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Verification code sent successfully.",
        })
      );
    });

    it("falls back to 'Unknown device' when no user-agent header is present", async () => {
      const req: any = {
        params: { id: "em1" },
        auth_user: AUTH_USER,
        headers: {},
      };

      await messageController.sendContactEmailVerificationHandler(req, res);

      expect(
        deps.emailService.sendContactEmailVerificationCode
      ).toHaveBeenCalledWith({ id: "em1", user_id: "u1" }, "Unknown device");
    });
  });

  // -------------------------------------------------------
  // Verify
  // -------------------------------------------------------
  describe("verifyContactPhoneHandler", () => {
    it("verifies the phone and returns the updated phone id", async () => {
      deps.verificationService.verifyContactPhone.mockResolvedValueOnce("ph1");
      const req: any = {
        params: { id: "ph1" },
        body: { verify_code: "123456" },
        auth_user: AUTH_USER,
      };

      const result = await messageController.verifyContactPhoneHandler(
        req,
        res
      );

      expect(deps.verificationService.verifyContactPhone).toHaveBeenCalledWith({
        id: "ph1",
        user_id: "u1",
        verify_code: "123456",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Phone number verified successfully.",
          data: { id: "ph1" },
        })
      );
      expect(result).toBe(res);
    });
  });

  describe("verifyContactEmailHandler", () => {
    it("verifies the email and returns the updated email id", async () => {
      deps.verificationService.verifyContactEmail.mockResolvedValueOnce("em1");
      const req: any = {
        params: { id: "em1" },
        body: { verify_code: "654321" },
        auth_user: AUTH_USER,
      };

      const result = await messageController.verifyContactEmailHandler(
        req,
        res
      );

      expect(deps.verificationService.verifyContactEmail).toHaveBeenCalledWith({
        id: "em1",
        user_id: "u1",
        verify_code: "654321",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Email verified successfully.",
          data: { id: "em1" },
        })
      );
      expect(result).toBe(res);
    });
  });
});
