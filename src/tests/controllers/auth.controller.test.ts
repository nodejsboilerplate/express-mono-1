import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthController } from "@/controllers/auth.controller";

vi.mock("@/services", () => ({
  CookieService: {
    ACCESS_TOKEN: {
      name: "accessToken",
      cookie: { httpOnly: false, sameSite: "lax" },
    },
    REFRESH_TOKEN: {
      name: "refreshToken",
      cookie: { httpOnly: false, sameSite: "lax" },
    },
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
  authService: {
    manualAuth: {
      signupByManual: vi.fn(),
      loginByManual: vi.fn(),
    },
    googleOAuth: {
      generateAuthUrlForLogin: vi.fn(),
      loginOrSignup: vi.fn(),
    },
    getAuthUserData: vi.fn(),
  },
  tokenService: {
    getCookies: vi.fn(),
  },
  verificationService: {
    verifySignupCode: vi.fn(),
  },
  emailService: {
    sendSignupCode: vi.fn(),
  },
});

describe("AuthController", () => {
  let deps: ReturnType<typeof buildDeps>;
  let authController: AuthController;
  let res: ReturnType<typeof buildRes>;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = buildDeps();
    authController = new AuthController(deps as any);
    res = buildRes();
  });

  // -------------------------------------------------------
  describe("signupUserHandler", () => {
    it("throws 400 if the request already carries an access or refresh token cookie", async () => {
      deps.tokenService.getCookies.mockReturnValueOnce({
        accessToken: "existing.jwt",
        refreshToken: undefined,
      });
      const req: any = { body: {}, headers: {} };

      await expect(authController.signupUserHandler(req, res)).rejects.toThrow(
        "USER_ALREADY_EXISTS"
      );
      expect(deps.authService.manualAuth.signupByManual).not.toHaveBeenCalled();
    });

    it("signs up, sets both cookies, and returns 201 with the new user id", async () => {
      deps.tokenService.getCookies.mockReturnValueOnce({
        accessToken: undefined,
        refreshToken: undefined,
      });
      deps.authService.manualAuth.signupByManual.mockResolvedValueOnce({
        tokens: { accessToken: "access.jwt", refreshToken: "refresh.jwt" },
        user_id: "u1",
      });

      const payload = {
        user: { email: "a@b.com" },
        profile: { first_name: "A" },
      };
      const req: any = { body: payload, headers: { "user-agent": "Chrome" } };

      const result = await authController.signupUserHandler(req, res);

      expect(deps.authService.manualAuth.signupByManual).toHaveBeenCalledWith(
        payload,
        "Chrome"
      );
      expect(res.cookie).toHaveBeenCalledWith(
        "accessToken",
        "access.jwt",
        expect.objectContaining({ httpOnly: false })
      );
      expect(res.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "refresh.jwt",
        expect.objectContaining({ httpOnly: false })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 201,
          message:
            "Account created successfully. Please verify your account using the code sent to you.",
          data: { id: "u1" },
        })
      );
      expect(result).toBe(res);
    });

    it("falls back to 'Unknown device' when no user-agent header is present", async () => {
      deps.tokenService.getCookies.mockReturnValueOnce({});
      deps.authService.manualAuth.signupByManual.mockResolvedValueOnce({
        tokens: { accessToken: "a", refreshToken: "r" },
        user_id: "u1",
      });
      const req: any = { body: {}, headers: {} };

      await authController.signupUserHandler(req, res);

      expect(deps.authService.manualAuth.signupByManual).toHaveBeenCalledWith(
        {},
        "Unknown device"
      );
    });
  });

  // -------------------------------------------------------
  describe("loginUserHandler", () => {
    it("logs in, sets both cookies, and returns 200", async () => {
      deps.authService.manualAuth.loginByManual.mockResolvedValueOnce({
        accessToken: "access.jwt",
        refreshToken: "refresh.jwt",
      });
      const payload = { identifier: "a@b.com", password: "secret123" };
      const req: any = { body: payload, headers: { "user-agent": "Safari" } };

      const result = await authController.loginUserHandler(req, res);

      expect(deps.authService.manualAuth.loginByManual).toHaveBeenCalledWith(
        payload,
        "Safari"
      );
      expect(res.cookie).toHaveBeenCalledWith(
        "accessToken",
        "access.jwt",
        expect.any(Object)
      );
      expect(res.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "refresh.jwt",
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 200, message: "Login Successful." })
      );
      expect(result).toBe(res);
    });

    it("propagates errors from manualAuth.loginByManual (e.g. bad credentials)", async () => {
      deps.authService.manualAuth.loginByManual.mockRejectedValueOnce(
        new Error("UNAUTHORIZED")
      );
      const req: any = { body: {}, headers: {} };

      await expect(authController.loginUserHandler(req, res)).rejects.toThrow(
        "UNAUTHORIZED"
      );
    });
  });

  // -------------------------------------------------------
  describe("redirectGoogleAuthHandler", () => {
    it("redirects to the Google consent URL", async () => {
      deps.authService.googleOAuth.generateAuthUrlForLogin.mockReturnValueOnce(
        "https://accounts.google.com/consent"
      );
      const req: any = {};

      const result = await authController.redirectGoogleAuthHandler(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        "https://accounts.google.com/consent"
      );
      expect(result).toBe(res);
    });
  });

  // -------------------------------------------------------
  describe("loginWithGoogleHandler", () => {
    it("logs in via Google, sets both cookies, and returns 201 with body status 200", async () => {
      deps.authService.googleOAuth.loginOrSignup.mockResolvedValueOnce({
        tokens: { accessToken: "g.access.jwt", refreshToken: "g.refresh.jwt" },
        user_id: "u1",
      });
      const req: any = {
        query: { code: "google-code" },
        headers: { "user-agent": "Chrome" },
      };

      const result = await authController.loginWithGoogleHandler(req, res);

      expect(deps.authService.googleOAuth.loginOrSignup).toHaveBeenCalledWith(
        "google-code",
        "Chrome"
      );
      expect(res.cookie).toHaveBeenCalledWith(
        "accessToken",
        "g.access.jwt",
        expect.any(Object)
      );
      expect(res.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "g.refresh.jwt",
        expect.any(Object)
      );
      // NOTE: as implemented, the HTTP status is 201 while the ApiResponse body's
      // own `status` field is 200 — asserting the current (slightly inconsistent)
      // behavior faithfully rather than "fixing" it in the test.
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          message: "OK",
          data: { id: "u1" },
        })
      );
      expect(result).toBe(res);
    });
  });

  // -------------------------------------------------------
  describe("authUserBasicDataProvider", () => {
    it("merges the session user (minus id/role) with the fetched profile data", async () => {
      deps.authService.getAuthUserData.mockResolvedValueOnce({
        avatar: "https://cdn.example.com/a.png",
        first_name: "Rahim",
        last_name: "Uddin",
        nickname: "Ray",
      });
      const req: any = {
        auth_user: {
          id: "u1",
          role: "USER",
          email: "a@b.com",
          username: "rahim_uddin",
          is_verified: true,
        },
      };

      const result = await authController.authUserBasicDataProvider(req, res);

      expect(deps.authService.getAuthUserData).toHaveBeenCalledWith("u1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          message: "OK",
          data: {
            email: "a@b.com",
            username: "rahim_uddin",
            is_verified: true,
            avatar: "https://cdn.example.com/a.png",
            first_name: "Rahim",
            last_name: "Uddin",
            nickname: "Ray",
          },
        })
      );
      // id/role are destructured off and NOT forwarded, as currently implemented.
      expect(res.json.mock.calls[0][0].data).not.toHaveProperty("id");
      expect(res.json.mock.calls[0][0].data).not.toHaveProperty("role");
      expect(result).toBe(res);
    });
  });
});
