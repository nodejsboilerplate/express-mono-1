import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "@/services";

// ---------------------------------------------------------
// Hoisted shared mock fns (so module-level singletons inside
// auth.service.ts share the same vi.fn() instances we control)
// ---------------------------------------------------------
const mocks = vi.hoisted(() => ({
  jwtSign: vi.fn(),
  jwtVerify: vi.fn(),
  bcryptCompare: vi.fn(),
  bcryptHash: vi.fn(),
  getUserDataForLogin: vi.fn(),
  setVerifyCodeForCoreUser: vi.fn(),
  getUserVerifyDetails: vi.fn(),
  updateUserVerifyDetails: vi.fn(),
  createUserWithProfile: vi.fn(),
  sendLoginCode: vi.fn(),
  sendSignupCode: vi.fn(),
  cacheUserLoginData: vi.fn(),
  isZodError: vi.fn(),
  validationError: vi.fn(),
  finalLoginResponseUserData: vi.fn(),
  generateVerificationCode: vi.fn(),
  getVerifyExpiry: vi.fn(),
}));

vi.mock("jsonwebtoken", () => ({
  default: { sign: mocks.jwtSign, verify: mocks.jwtVerify },
}));

vi.mock("bcryptjs", () => ({
  default: { compare: mocks.bcryptCompare, hash: mocks.bcryptHash },
}));

vi.mock("@/config", () => ({
  authConfig: {
    JWT_ACCESS_TOKEN_SECRET: "access-secret",
    JWT_REFRESH_TOKEN_SECRET: "refresh-secret",
  },
}));

vi.mock("./cookie.service", () => ({
  ACCESS_TOKEN_EXPIRY_SEC: 900,
  REFRESH_TOKEN_EXPIRY_SEC: 604800,
  CookieService: {
    ACCESS_TOKEN: { name: "access_token", cookie: {} },
    REFRESH_TOKEN: { name: "refresh_token", cookie: {} },
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
}));

vi.mock("@/utils", () => ({
  finalLoginResponseUserData: mocks.finalLoginResponseUserData,
  generateVerificationCode: mocks.generateVerificationCode,
  getVerifyExpiry: mocks.getVerifyExpiry,
  isZodError: mocks.isZodError,
  validationError: mocks.validationError,
}));

vi.mock("@/validators/inputs", () => ({
  UserInputValidators: class {
    loginUserInput(p: unknown) {
      return p;
    }
    emailInput(p: unknown) {
      return p;
    }
    verifyCodeInput(p: unknown) {
      return p;
    }
  },
}));

vi.mock("@/redis", () => ({
  AuthRedis: class {
    cacheUserLoginData = mocks.cacheUserLoginData;
  },
}));

vi.mock("@/database/repositories", () => ({
  UserRepository: class {
    GetUserDataForLoginByEmailOrUsernameOrId = mocks.getUserDataForLogin;
    SetVerifyCodeForCoreUser = mocks.setVerifyCodeForCoreUser;
    GetUserVerifyDetails = mocks.getUserVerifyDetails;
    UpdateUserVerifyDetails = mocks.updateUserVerifyDetails;
  },
}));

vi.mock("./user.service", () => ({
  UserService: class {
    createUserWithProfile = mocks.createUserWithProfile;
  },
}));

vi.mock("./email.service", () => ({
  EmailService: class {
    sendLoginCode = mocks.sendLoginCode;
    sendSignupCode = mocks.sendSignupCode;
  },
}));

const ApiErrorLike = (status: number, message: string) => {
  const e: any = new Error(message);
  e.status = status;
  return e;
};

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isZodError.mockReturnValue(false);
    authService = new AuthService();
  });

  // -------------------------------------------------------
  describe("createTokens", () => {
    it("signs access + refresh tokens with correct secrets/expiry", () => {
      mocks.jwtSign
        .mockReturnValueOnce("access.jwt")
        .mockReturnValueOnce("refresh.jwt");

      const payload = { id: "u1", role: "USER" } as any;
      const tokens = authService.createTokens(payload);

      expect(mocks.jwtSign).toHaveBeenNthCalledWith(
        1,
        payload,
        "access-secret",
        expect.objectContaining({ expiresIn: 900 })
      );
      expect(mocks.jwtSign).toHaveBeenNthCalledWith(
        2,
        { id: "u1", role: "USER" },
        "refresh-secret",
        expect.objectContaining({ expiresIn: 604800 })
      );
      expect(tokens).toEqual({
        accessToken: "access.jwt",
        refreshToken: "refresh.jwt",
      });
    });
  });

  describe("renewAccessToken", () => {
    it("signs a new access token", () => {
      mocks.jwtSign.mockReturnValueOnce("new.access");
      const result = authService.renewAccessToken({ id: "u1" } as any);
      expect(mocks.jwtSign).toHaveBeenCalledWith(
        { id: "u1" },
        "access-secret",
        expect.objectContaining({ expiresIn: 900 })
      );
      expect(result).toBe("new.access");
    });
  });

  describe("renewRefreshToken", () => {
    it("signs a new refresh token with only the id", () => {
      mocks.jwtSign.mockReturnValueOnce("new.refresh");
      const result = authService.renewRefreshToken({ id: "u1" } as any);
      expect(mocks.jwtSign).toHaveBeenCalledWith(
        { id: "u1" },
        "refresh-secret",
        expect.objectContaining({ expiresIn: 604800 })
      );
      expect(result).toBe("new.refresh");
    });
  });

  describe("getDataFromAccessToken", () => {
    it("returns decoded payload on success", () => {
      const decoded = { id: "u1", role: "USER" };
      mocks.jwtVerify.mockReturnValueOnce(decoded);
      const result = authService.getDataFromAccessToken("tok");
      expect(mocks.jwtVerify).toHaveBeenCalledWith("tok", "access-secret");
      expect(result).toEqual(decoded);
    });

    it("returns null when jwt.verify throws", () => {
      mocks.jwtVerify.mockImplementationOnce(() => {
        throw new Error("bad");
      });
      expect(authService.getDataFromAccessToken("bad-tok")).toBeNull();
    });
  });

  describe("getDataFromRefreshToken", () => {
    it("returns decoded payload on success", () => {
      const decoded = { id: "u1" };
      mocks.jwtVerify.mockReturnValueOnce(decoded);
      expect(authService.getDataFromRefreshToken("tok")).toEqual(decoded);
    });

    it("throws 401 ApiError when jwt.verify throws", () => {
      mocks.jwtVerify.mockImplementationOnce(() => {
        throw new Error("bad");
      });
      expect(() => authService.getDataFromRefreshToken("bad")).toThrowError(
        expect.objectContaining({ status: 401 })
      );
    });
  });

  describe("getCookies", () => {
    it("extracts tokens from request cookies", () => {
      const req = {
        cookies: { access_token: "acc", refresh_token: "ref" },
      } as any;
      expect(authService.getCookies(req)).toEqual({
        accessToken: "acc",
        refreshToken: "ref",
      });
    });

    it("returns undefined when cookies absent", () => {
      const req = { cookies: {} } as any;
      expect(authService.getCookies(req)).toEqual({
        accessToken: undefined,
        refreshToken: undefined,
      });
    });
  });

  // -------------------------------------------------------
  describe("loginUser", () => {
    const payload = { identifier: "user@test.com", password: "secret123" };

    it("throws validation error on invalid payload", async () => {
      mocks.isZodError.mockReturnValueOnce(true);
      mocks.validationError.mockReturnValueOnce(
        ApiErrorLike(400, "VALIDATION_ERROR")
      );
      await expect(authService.loginUser(payload as any)).rejects.toThrow(
        "VALIDATION_ERROR"
      );
    });

    it("throws 404 when user not found", async () => {
      mocks.getUserDataForLogin.mockResolvedValueOnce(undefined);
      await expect(authService.loginUser(payload as any)).rejects.toThrow(
        "USER_NOT_FOUND"
      );
    });

    it("throws 401 on password mismatch", async () => {
      mocks.getUserDataForLogin.mockResolvedValueOnce({
        id: "u1",
        email: "user@test.com",
        password: "hashed",
        profile: {},
      });
      mocks.bcryptCompare.mockResolvedValueOnce(false);
      await expect(authService.loginUser(payload as any)).rejects.toThrow(
        "UNAUTHORIZED"
      );
    });

    it("logs in successfully, caches data, and returns tokens", async () => {
      mocks.getUserDataForLogin.mockResolvedValueOnce({
        id: "u1",
        email: "user@test.com",
        password: "hashed",
        profile: { first_name: "A" },
      });
      mocks.bcryptCompare.mockResolvedValueOnce(true);
      mocks.finalLoginResponseUserData.mockReturnValueOnce({
        tokenData: { id: "u1", role: "USER" },
        profileData: { first_name: "A" },
      });
      mocks.jwtSign
        .mockReturnValueOnce("access.jwt")
        .mockReturnValueOnce("refresh.jwt");
      mocks.cacheUserLoginData.mockResolvedValueOnce(true);

      const result = await authService.loginUser(payload as any);

      expect(mocks.cacheUserLoginData).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({ id: "u1", role: "USER", first_name: "A" })
      );
      expect(result).toEqual({
        accessToken: "access.jwt",
        refreshToken: "refresh.jwt",
      });
    });

    it("sends a login verification email when no password provided (passwordless flow)", async () => {
      const passwordless = { identifier: "user@test.com" };
      mocks.getUserDataForLogin
        .mockResolvedValueOnce({
          id: "u1",
          email: "user@test.com",
          profile: {},
          is_verified: true,
        })
        .mockResolvedValueOnce({
          id: "u1",
          email: "user@test.com",
          is_verified: true,
        });
      mocks.finalLoginResponseUserData.mockReturnValueOnce({
        tokenData: { id: "u1" },
        profileData: {},
      });
      mocks.jwtSign.mockReturnValue("tok");
      mocks.setVerifyCodeForCoreUser.mockResolvedValueOnce({ id: "u1" });

      await authService.loginUser(passwordless as any);

      expect(mocks.sendLoginCode).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------
  describe("signupUser", () => {
    it("creates the user, caches login data, sends verification email, and returns tokens", async () => {
      mocks.createUserWithProfile.mockResolvedValueOnce({
        user: { id: "u1", email: "new@test.com", is_verified: false },
        profile: { first_name: "New" },
      });
      mocks.finalLoginResponseUserData.mockReturnValueOnce({
        tokenData: { id: "u1" },
        profileData: { first_name: "New" },
      });
      mocks.jwtSign
        .mockReturnValueOnce("access.jwt")
        .mockReturnValueOnce("refresh.jwt");
      mocks.getUserDataForLogin.mockResolvedValueOnce({
        id: "u1",
        email: "new@test.com",
        is_verified: false,
      });
      mocks.setVerifyCodeForCoreUser.mockResolvedValueOnce({ id: "u1" });

      const result = await authService.signupUser(
        { user: { email: "new@test.com" }, profile: {} } as any,
        "test-device"
      );

      expect(mocks.cacheUserLoginData).toHaveBeenCalled();
      expect(mocks.sendSignupCode).toHaveBeenCalled();
      expect(result).toEqual({
        tokens: { accessToken: "access.jwt", refreshToken: "refresh.jwt" },
        user_id: "u1",
      });
    });
  });

  // -------------------------------------------------------
  describe("sendLoginVerificationEmail", () => {
    it("throws validation error for invalid email", async () => {
      mocks.isZodError.mockReturnValueOnce(true);
      mocks.validationError.mockReturnValueOnce(
        ApiErrorLike(400, "INVALID_EMAIL")
      );
      await expect(
        authService.sendLoginVerificationEmail("bad", "d")
      ).rejects.toThrow("INVALID_EMAIL");
    });

    it("throws 404 when user not found", async () => {
      mocks.getUserDataForLogin.mockResolvedValueOnce(undefined);
      await expect(
        authService.sendLoginVerificationEmail("a@b.com", "d")
      ).rejects.toThrow("USER_NOT_FOUND");
    });

    it("throws 400 when user not verified", async () => {
      mocks.getUserDataForLogin.mockResolvedValueOnce({
        id: "u1",
        is_verified: false,
        email: "a@b.com",
      });
      await expect(
        authService.sendLoginVerificationEmail("a@b.com", "d")
      ).rejects.toThrow("USER_NOT_VERIFIED");
    });

    it("sends the login code on success", async () => {
      mocks.getUserDataForLogin.mockResolvedValueOnce({
        id: "u1",
        is_verified: true,
        email: "a@b.com",
      });
      mocks.setVerifyCodeForCoreUser.mockResolvedValueOnce({ id: "u1" });

      await authService.sendLoginVerificationEmail("a@b.com", "device-x");

      expect(mocks.sendLoginCode).toHaveBeenCalledWith(
        "a@b.com",
        expect.any(String),
        "device-x"
      );
    });
  });

  // -------------------------------------------------------
  describe("sendSignupVerificationEmail", () => {
    it("throws 400 when user is already verified", async () => {
      mocks.getUserDataForLogin.mockResolvedValueOnce({
        id: "u1",
        is_verified: true,
        email: "a@b.com",
      });
      await expect(
        authService.sendSignupVerificationEmail("a@b.com", "d")
      ).rejects.toThrow("USER_ALREADY_VERIFIED");
    });

    it("sends the signup code on success", async () => {
      mocks.getUserDataForLogin.mockResolvedValueOnce({
        id: "u1",
        is_verified: false,
        email: "a@b.com",
      });
      mocks.setVerifyCodeForCoreUser.mockResolvedValueOnce({ id: "u1" });

      await authService.sendSignupVerificationEmail("a@b.com", "device-x");

      expect(mocks.sendSignupCode).toHaveBeenCalledWith(
        "a@b.com",
        expect.any(String),
        "device-x"
      );
    });
  });

  // -------------------------------------------------------
  describe("verifySignupCode", () => {
    const payload = { id: "u1", verify_code: "123456" };

    it("throws 404 when user not found", async () => {
      mocks.getUserVerifyDetails.mockResolvedValueOnce(undefined);
      await expect(
        authService.verifySignupCode(payload as any)
      ).rejects.toThrow("USER_NOT_FOUND");
    });

    it("throws 400 when already verified", async () => {
      mocks.getUserVerifyDetails.mockResolvedValueOnce({
        id: "u1",
        is_verified: true,
      });
      await expect(
        authService.verifySignupCode(payload as any)
      ).rejects.toThrow("USER_ALREADY_VERIFIED");
    });

    it("throws 400 on invalid verification code", async () => {
      mocks.getUserVerifyDetails.mockResolvedValueOnce({
        id: "u1",
        is_verified: false,
        verify_code: "000000",
        verify_expiry: new Date(Date.now() + 60_000),
      });
      await expect(
        authService.verifySignupCode(payload as any)
      ).rejects.toThrow("INVALID_VERIFICATION_CODE");
    });

    it("throws 400 on expired verification code", async () => {
      mocks.getUserVerifyDetails.mockResolvedValueOnce({
        id: "u1",
        is_verified: false,
        verify_code: "123456",
        verify_expiry: new Date(Date.now() - 60_000),
      });
      await expect(
        authService.verifySignupCode(payload as any)
      ).rejects.toThrow("VERIFICATION_CODE_EXPIRED");
    });

    it("verifies successfully and returns the user id", async () => {
      mocks.getUserVerifyDetails.mockResolvedValueOnce({
        id: "u1",
        is_verified: false,
        verify_code: "123456",
        verify_expiry: new Date(Date.now() + 60_000),
      });
      mocks.updateUserVerifyDetails.mockResolvedValueOnce({ id: "u1" });

      const result = await authService.verifySignupCode(payload as any);
      expect(result).toBe("u1");
    });
  });
});
