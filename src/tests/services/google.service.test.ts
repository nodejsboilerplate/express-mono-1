import { describe, expect, test, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { GoogleService } from "@/services";
import { authConfig } from "@/config";
import { UserService } from "@/services/user.service";

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

vi.mock("@/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils")>();
  return {
    ...actual,
    generateRandomUsername: vi.fn(() => "MockUser1234567"),
  };
});

const googleService = new GoogleService();

beforeEach(() => {
  vi.clearAllMocks();
});

function mockGoogleProfile(overrides: Partial<any> = {}) {
  return {
    email: `test-${crypto.randomUUID()}@example.com`,
    email_verified: true,
    name: "Mahin",
    picture: "https://example.com/avatar.png",
    ...overrides,
  };
}

describe("GoogleService Test", { tags: ["services/google"] }, () => {
  describe("GoogleService.generateAuthUrlForLogin", () => {
    test("returns a Google OAuth consent URL", () => {
      const url = googleService.generateAuthUrlForLogin();
      expect(typeof url).toBe("string");
      expect(url).toContain("https://");
    });
  });

  describe("GoogleService.login", () => {
    test("throws 401 when no code is provided", async () => {
      await expect(googleService.login("", "test-device")).rejects.toThrow();
    });

    test("throws 503 when no idToken is returned from Google", async () => {
      vi.spyOn(googleService, "getIdTokensByAuthCode").mockResolvedValue({
        idToken: null as any,
      });

      await expect(
        googleService.login("some-auth-code", "test-device")
      ).rejects.toThrow();
    });

    test("creates a new user, caches login data, and returns tokens for a verified email", async () => {
      const profile = mockGoogleProfile({ email_verified: true });

      vi.spyOn(googleService, "getIdTokensByAuthCode").mockResolvedValue({
        idToken: "mock-id-token",
      });
      vi.spyOn(googleService, "getUserProfileByIdToken").mockResolvedValue(
        profile as any
      );

      const createdUser = {
        id: crypto.randomUUID(),
        email: profile.email,
        username: "MockUser1234567",
        role: "USER" as const,
        is_verified: true,
      };
      vi.spyOn(
        UserService.prototype,
        "createUserWithProfileByProvider"
      ).mockResolvedValue(createdUser as any);

      const result = await googleService.login(
        "valid-auth-code",
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
      expect(decoded.email).toBe(profile.email);
      expect(decoded.role).toBe("USER");

      expect(cacheUserLoginDataMock).toHaveBeenCalledTimes(1);
      expect(cacheUserLoginDataMock).toHaveBeenCalledWith(
        createdUser.id,
        expect.objectContaining({ id: createdUser.id, email: profile.email })
      );

      // is_verified is true, so no signup code should be sent
      expect(sendSignupCodeMock).not.toHaveBeenCalled();
    });

    test("sends a signup code with device info when the Google email is not verified", async () => {
      const profile = mockGoogleProfile({ email_verified: false });

      vi.spyOn(googleService, "getIdTokensByAuthCode").mockResolvedValue({
        idToken: "mock-id-token",
      });
      vi.spyOn(googleService, "getUserProfileByIdToken").mockResolvedValue(
        profile as any
      );

      const createdUser = {
        id: crypto.randomUUID(),
        email: profile.email,
        username: "MockUser1234567",
        role: "USER" as const,
        is_verified: false,
      };
      vi.spyOn(
        UserService.prototype,
        "createUserWithProfileByProvider"
      ).mockResolvedValue(createdUser as any);

      await googleService.login("valid-auth-code", "Chrome on macOS");

      expect(sendSignupCodeMock).toHaveBeenCalledTimes(1);
      expect(sendSignupCodeMock).toHaveBeenCalledWith(
        profile.email,
        "Chrome on macOS"
      );
    });

    test("returns existing user's tokens on repeat login (no duplicate creation)", async () => {
      const profile = mockGoogleProfile({ email_verified: true });

      vi.spyOn(googleService, "getIdTokensByAuthCode").mockResolvedValue({
        idToken: "mock-id-token",
      });
      vi.spyOn(googleService, "getUserProfileByIdToken").mockResolvedValue(
        profile as any
      );

      const existingUser = {
        id: crypto.randomUUID(),
        email: profile.email,
        username: "existing_user",
        role: "USER" as const,
        is_verified: true,
      };

      const createSpy = vi
        .spyOn(UserService.prototype, "createUserWithProfileByProvider")
        .mockResolvedValue(existingUser as any);

      const result = await googleService.login(
        "valid-auth-code",
        "Chrome on macOS"
      );

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(result.user_id).toBe(existingUser.id);
    });
  });
});
