import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthController } from "@/controllers/auth.controller";

const mocks = vi.hoisted(() => ({ cookieSet: vi.fn() }));

// AuthController imports CookieService from the "@/services" barrel.
vi.mock("@/services", () => ({
  CookieService: {
    ACCESS_TOKEN: { name: "accessToken", cookie: { maxAge: 300_000 } },
    REFRESH_TOKEN: { name: "refreshToken", cookie: { maxAge: 2_592_000_000 } },
  },
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
  ApiResponse: class {
    status: number;
    message: string;
    data: unknown;
    success = true;
    title = "";
    constructor(status: number, message: string, data?: unknown) {
      this.status = status;
      this.message = message;
      this.data = data ?? null;
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

describe("AuthController", () => {
  let authService: any;
  let tokenService: any;
  let verificationService: any;
  let emailService: any;
  let authController: AuthController;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = {
      manualAuth: { signupByManual: vi.fn(), loginByManual: vi.fn() },
      googleOAuth: { generateAuthUrlForLogin: vi.fn(), loginOrSignup: vi.fn() },
      getAuthUserData: vi.fn(),
    };
    tokenService = { getCookies: vi.fn() };
    verificationService = { verifySignupCode: vi.fn() };
    emailService = { sendSignupCode: vi.fn() };

    authController = new AuthController({
      authService,
      tokenService,
      verificationService,
      emailService,
    });
  });

  describe("signupUserHandler", () => {
    it("throws 400 when the request already carries session cookies", async () => {
      tokenService.getCookies.mockReturnValueOnce({
        accessToken: "acc",
        refreshToken: "ref",
      });
      const req = { body: {}, headers: {} } as any;
      await expect(
        authController.signupUserHandler(req, buildRes())
      ).rejects.toThrow("USER_ALREADY_EXISTS");
      expect(authService.manualAuth.signupByManual).not.toHaveBeenCalled();
    });

    it("signs up, sets both cookies, and returns 201 with the new user id", async () => {
      tokenService.getCookies.mockReturnValueOnce({
        accessToken: undefined,
        refreshToken: undefined,
      });
      authService.manualAuth.signupByManual.mockResolvedValueOnce({
        tokens: { accessToken: "acc", refreshToken: "ref" },
        user_id: "u1",
      });
      const req = {
        body: { user: {}, profile: {} },
        headers: { "user-agent": "jest" },
      } as any;
      const res = buildRes();

      await authController.signupUserHandler(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        "accessToken",
        "acc",
        expect.anything()
      );
      expect(res.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "ref",
        expect.anything()
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: { id: "u1" } })
      );
    });
  });

  describe("loginUserHandler", () => {
    it("logs in and sets both cookies", async () => {
      authService.manualAuth.loginByManual.mockResolvedValueOnce({
        accessToken: "acc",
        refreshToken: "ref",
      });
      const req = { body: { identifier: "a@b.com" }, headers: {} } as any;
      const res = buildRes();

      await authController.loginUserHandler(req, res);

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Login Successful." })
      );
    });
  });

  describe("resendSignupCodeHandler", () => {
    it("sends the signup code to the authenticated user's email", async () => {
      emailService.sendSignupCode.mockResolvedValueOnce(undefined);
      const req = { auth_user: { email: "a@b.com" }, headers: {} } as any;
      const res = buildRes();

      await authController.resendSignupCodeHandler(req, res);

      expect(emailService.sendSignupCode).toHaveBeenCalledWith(
        "a@b.com",
        expect.any(String)
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("verifySignupCodeHandler", () => {
    it("throws 400 when the user is already verified", async () => {
      const req = {
        auth_user: { id: "u1", is_verified: true },
        body: {},
      } as any;
      await expect(
        authController.verifySignupCodeHandler(req, buildRes())
      ).rejects.toThrow("USER_ALREADY_VERIFIED");
      expect(verificationService.verifySignupCode).not.toHaveBeenCalled();
    });

    it("verifies the code and returns the verified user id", async () => {
      verificationService.verifySignupCode.mockResolvedValueOnce("u1");
      const req = {
        auth_user: { id: "u1", is_verified: false },
        body: { verify_code: "123456" },
      } as any;
      const res = buildRes();

      await authController.verifySignupCodeHandler(req, res);

      expect(verificationService.verifySignupCode).toHaveBeenCalledWith({
        verify_code: "123456",
        id: "u1",
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: { id: "u1" } })
      );
    });
  });

  describe("redirectGoogleAuthHandler", () => {
    it("redirects to the Google consent URL", async () => {
      authService.googleOAuth.generateAuthUrlForLogin.mockReturnValueOnce(
        "https://google.com/consent"
      );
      const res = buildRes();
      await authController.redirectGoogleAuthHandler({} as any, res);
      expect(res.redirect).toHaveBeenCalledWith("https://google.com/consent");
    });
  });

  describe("loginWithGoogleHandler", () => {
    it("logs in via Google, sets both cookies, and returns the user id", async () => {
      authService.googleOAuth.loginOrSignup.mockResolvedValueOnce({
        tokens: { accessToken: "acc", refreshToken: "ref" },
        user_id: "u1",
      });
      const req = { query: { code: "google-code" }, headers: {} } as any;
      const res = buildRes();

      await authController.loginWithGoogleHandler(req, res);

      expect(authService.googleOAuth.loginOrSignup).toHaveBeenCalledWith(
        "google-code",
        expect.any(String)
      );
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: { id: "u1" } })
      );
    });
  });

  describe("authUserBasicDataProvider", () => {
    it("strips id/role off req.auth_user and merges in the fetched profile fields", async () => {
      authService.getAuthUserData.mockResolvedValueOnce({
        avatar: "a.png",
        first_name: "A",
        last_name: "B",
        nickname: "Al",
      });
      const req = {
        auth_user: {
          id: "u1",
          role: "USER",
          email: "a@b.com",
          username: "alice",
          is_verified: true,
        },
      } as any;
      const res = buildRes();

      await authController.authUserBasicDataProvider(req, res);

      expect(authService.getAuthUserData).toHaveBeenCalledWith("u1");
      const [payload] = res.json.mock.calls[0];
      expect(payload.data).toEqual({
        email: "a@b.com",
        username: "alice",
        is_verified: true,
        avatar: "a.png",
        first_name: "A",
        last_name: "B",
        nickname: "Al",
      });
      expect(payload.data).not.toHaveProperty("id");
      expect(payload.data).not.toHaveProperty("role");
    });
  });
});
