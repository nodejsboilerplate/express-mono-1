import { describe, expect, test, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { AuthService, UserService } from "@/services";
import { authConfig } from "@/config";
import { UserRepository } from "@/database/repositories";

const { cacheUserLoginDataMock } = vi.hoisted(() => ({
  cacheUserLoginDataMock: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/redis")>();
  return {
    ...actual,
    AuthRedis: class {
      cacheUserLoginData = cacheUserLoginDataMock;
    },
  };
});

const { sendSignupCodeMock } = vi.hoisted(() => ({
  sendSignupCodeMock: vi.fn().mockResolvedValue("mock-user-id"),
}));
vi.mock("@/services/email.service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/email.service")>();
  return {
    ...actual,
    EmailService: class {
      sendSignupCode = sendSignupCodeMock;
    },
  };
});

const authService = new AuthService();

beforeEach(() => {
  vi.clearAllMocks();
});

function mockUserRecord(overrides: Partial<any> = {}) {
  return {
    id: crypto.randomUUID(),
    email: `test-${crypto.randomUUID()}@example.com`,
    username: "mockuser",
    role: "USER" as const,
    is_verified: true,
    password: "hashed-password",
    ...overrides,
  };
}

describe("AuthService Test", { tags: ["services/auth"] }, () => {
  describe("AuthService.createTokens / renewAccessToken / renewRefreshToken", () => {
    test("createTokens returns a signed access and refresh token", () => {
      const payload = {
        id: crypto.randomUUID(),
        email: "test@example.com",
        username: "tester",
        role: "USER" as const,
        is_verified: true,
      };

      const { accessToken, refreshToken } = authService.createTokens(payload);

      const decodedAccess = jwt.verify(
        accessToken,
        authConfig.JWT_ACCESS_TOKEN_SECRET
      ) as any;
      const decodedRefresh = jwt.verify(
        refreshToken,
        authConfig.JWT_REFRESH_TOKEN_SECRET
      ) as any;

      expect(decodedAccess.id).toBe(payload.id);
      expect(decodedAccess.email).toBe(payload.email);
      expect(decodedRefresh.id).toBe(payload.id);
      expect(decodedRefresh.role).toBe(payload.role);
    });

    test("renewAccessToken issues a fresh access token", () => {
      const payload = {
        id: crypto.randomUUID(),
        email: "test@example.com",
        username: "tester",
        role: "USER" as const,
        is_verified: true,
      };

      const token = authService.renewAccessToken(payload);
      const decoded = jwt.verify(
        token,
        authConfig.JWT_ACCESS_TOKEN_SECRET
      ) as any;

      expect(decoded.id).toBe(payload.id);
    });

    test("renewRefreshToken issues a fresh refresh token containing only the id", () => {
      const payload = { id: crypto.randomUUID(), role: "USER" as const };

      const token = authService.renewRefreshToken(payload as any);
      const decoded = jwt.verify(
        token,
        authConfig.JWT_REFRESH_TOKEN_SECRET
      ) as any;

      expect(decoded.id).toBe(payload.id);
    });
  });

  describe("AuthService.getDataFromAccessToken", () => {
    test("returns decoded payload for a valid token", () => {
      const payload = {
        id: crypto.randomUUID(),
        email: "test@example.com",
        username: "tester",
        role: "USER" as const,
        is_verified: true,
      };
      const { accessToken } = authService.createTokens(payload);

      const decoded = authService.getDataFromAccessToken(accessToken);

      expect(decoded?.id).toBe(payload.id);
    });

    test("returns null for an invalid token", () => {
      const decoded = authService.getDataFromAccessToken("not-a-real-token");
      expect(decoded).toBeNull();
    });
  });

  describe("AuthService.getDataFromRefreshToken", () => {
    test("returns decoded payload for a valid refresh token", () => {
      const payload = {
        id: crypto.randomUUID(),
        email: "test@example.com",
        username: "tester",
        role: "USER" as const,
        is_verified: true,
      };
      const { refreshToken } = authService.createTokens(payload);

      const decoded = authService.getDataFromRefreshToken(refreshToken);

      expect(decoded.id).toBe(payload.id);
    });

    test("throws 401 for an invalid refresh token", () => {
      expect(() =>
        authService.getDataFromRefreshToken("not-a-real-token")
      ).toThrow();
    });
  });

  describe("AuthService.loginUser", () => {
    test("throws when the identifier/password payload is invalid", async () => {
      await expect(
        authService.loginUser({ identifier: "", password: "" } as any)
      ).rejects.toThrow();
    });

    test("throws 404 when no user is found for the identifier", async () => {
      vi.spyOn(
        UserRepository.prototype,
        "GetUserDataForLoginByEmailOrUsername"
      ).mockResolvedValue(null as any);

      await expect(
        authService.loginUser({
          identifier: "nouser@example.com",
          password: "password123",
        })
      ).rejects.toThrow();
    });

    test("throws 401 when the password does not match", async () => {
      const user = mockUserRecord();
      vi.spyOn(
        UserRepository.prototype,
        "GetUserDataForLoginByEmailOrUsername"
      ).mockResolvedValue(user as any);
      vi.spyOn(bcrypt, "compare").mockResolvedValue(false as never);

      await expect(
        authService.loginUser({
          identifier: user.email,
          password: "wrong-password",
        })
      ).rejects.toThrow();
    });

    test("returns tokens and caches login data on successful login", async () => {
      const user = mockUserRecord();
      vi.spyOn(
        UserRepository.prototype,
        "GetUserDataForLoginByEmailOrUsername"
      ).mockResolvedValue(user as any);
      vi.spyOn(bcrypt, "compare").mockResolvedValue(true as never);

      const result = await authService.loginUser({
        identifier: user.email,
        password: "correct-password",
      });

      expect(typeof result.accessToken).toBe("string");
      expect(typeof result.refreshToken).toBe("string");

      const decoded = jwt.verify(
        result.accessToken,
        authConfig.JWT_ACCESS_TOKEN_SECRET
      ) as any;
      expect(decoded.id).toBe(user.id);
      expect(decoded.email).toBe(user.email);

      expect(cacheUserLoginDataMock).toHaveBeenCalledTimes(1);
      // the cached payload should not include the password
      expect(cacheUserLoginDataMock).toHaveBeenCalledWith(
        user.id,
        expect.not.objectContaining({ password: expect.anything() })
      );
    });
  });

  describe("AuthService.signupUser", () => {
    test("creates a user, caches login data, sends a signup code, and returns tokens", async () => {
      const createdUser = {
        id: crypto.randomUUID(),
        email: `test-${crypto.randomUUID()}@example.com`,
        username: "newuser",
        role: "USER" as const,
        is_verified: false,
      };

      vi.spyOn(
        UserService.prototype,
        "createUserWithProfile"
      ).mockResolvedValue({
        user: createdUser,
      } as any);

      const result = await authService.signupUser(
        {
          email: createdUser.email,
          username: createdUser.username,
          password: "password123",
        } as any,
        "Chrome on macOS"
      );

      expect(result.user_id).toBe(createdUser.id);
      expect(typeof result.tokens.accessToken).toBe("string");
      expect(typeof result.tokens.refreshToken).toBe("string");

      const decoded = jwt.verify(
        result.tokens.accessToken,
        authConfig.JWT_ACCESS_TOKEN_SECRET
      ) as any;
      expect(decoded.id).toBe(createdUser.id);
      expect(decoded.email).toBe(createdUser.email);

      expect(cacheUserLoginDataMock).toHaveBeenCalledTimes(1);
      expect(sendSignupCodeMock).toHaveBeenCalledTimes(1);
      expect(sendSignupCodeMock).toHaveBeenCalledWith(
        createdUser.email,
        "Chrome on macOS"
      );
    });
  });

  describe("AuthService.verifySignupCode", () => {
    test("throws when the payload is invalid", async () => {
      await expect(
        authService.verifySignupCode({ id: "", verify_code: "" } as any)
      ).rejects.toThrow();
    });

    test("throws 404 when the user is not found", async () => {
      vi.spyOn(
        UserRepository.prototype,
        "GetUserVerifyDetails"
      ).mockResolvedValue(null as any);

      await expect(
        authService.verifySignupCode({
          id: crypto.randomUUID(),
          verify_code: "123456",
        })
      ).rejects.toThrow();
    });

    test("throws 400 when the user is already verified", async () => {
      vi.spyOn(
        UserRepository.prototype,
        "GetUserVerifyDetails"
      ).mockResolvedValue({
        id: crypto.randomUUID(),
        is_verified: true,
      } as any);

      await expect(
        authService.verifySignupCode({
          id: crypto.randomUUID(),
          verify_code: "123456",
        })
      ).rejects.toThrow();
    });

    test("throws 400 when the verify code does not match", async () => {
      vi.spyOn(
        UserRepository.prototype,
        "GetUserVerifyDetails"
      ).mockResolvedValue({
        id: crypto.randomUUID(),
        is_verified: false,
        verify_code: "111111",
        verify_expiry: new Date(Date.now() + 60_000),
      } as any);

      await expect(
        authService.verifySignupCode({
          id: crypto.randomUUID(),
          verify_code: "999999",
        })
      ).rejects.toThrow();
    });

    test("throws 400 when the verify code has expired", async () => {
      vi.spyOn(
        UserRepository.prototype,
        "GetUserVerifyDetails"
      ).mockResolvedValue({
        id: crypto.randomUUID(),
        is_verified: false,
        verify_code: "123456",
        verify_expiry: new Date(Date.now() - 60_000),
      } as any);

      await expect(
        authService.verifySignupCode({
          id: crypto.randomUUID(),
          verify_code: "123456",
        })
      ).rejects.toThrow();
    });

    test("verifies the user and returns their id on success", async () => {
      const userId = crypto.randomUUID();
      vi.spyOn(
        UserRepository.prototype,
        "GetUserVerifyDetails"
      ).mockResolvedValue({
        id: userId,
        is_verified: false,
        verify_code: "123456",
        verify_expiry: new Date(Date.now() + 60_000),
      } as any);
      vi.spyOn(
        UserRepository.prototype,
        "UpdateUserVerifyDetails"
      ).mockResolvedValue({
        id: userId,
      } as any);

      const result = await authService.verifySignupCode({
        id: userId,
        verify_code: "123456",
      });

      expect(result).toBe(userId);
    });

    test("throws 500 if the verify update fails", async () => {
      vi.spyOn(
        UserRepository.prototype,
        "GetUserVerifyDetails"
      ).mockResolvedValue({
        id: crypto.randomUUID(),
        is_verified: false,
        verify_code: "123456",
        verify_expiry: new Date(Date.now() + 60_000),
      } as any);
      vi.spyOn(
        UserRepository.prototype,
        "UpdateUserVerifyDetails"
      ).mockResolvedValue(null as any);

      await expect(
        authService.verifySignupCode({
          id: crypto.randomUUID(),
          verify_code: "123456",
        })
      ).rejects.toThrow();
    });
  });
});
