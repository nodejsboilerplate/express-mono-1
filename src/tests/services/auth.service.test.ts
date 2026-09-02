import { describe, expect, test, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { pgDb } from "@/libs/db.connect";
import { CookieService } from "@/services/cookie.service";
import { usersTable } from "@/database";
import { eq } from "drizzle-orm";
import { authConfig } from "@/config";
import { AuthService, UserService } from "@/services";
import { AuthRedis } from "@/redis";

const userService = new UserService()
const authService = new AuthService()
const authRedis = new AuthRedis()

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

beforeEach(() => {
  vi.clearAllMocks();
});

function validUserWithProfilePayload(
  overrides: { user?: Partial<any>; profile?: Partial<any> } = {}
) {
  return {
    user: {
      email: `test-${crypto.randomUUID()}@example.com`,
      username: `user_${crypto.randomUUID().slice(0, 8)}`,
      password: "SuperSecret123!",
      role: "USER" as const,
      ...overrides.user,
    },
    profile: {
      first_name: "Mahin",
      ...overrides.profile,
    },
  };
}

async function createUser(
  overrides: { user?: Partial<any>; profile?: Partial<any> } = {}
) {
  const payload = validUserWithProfilePayload(overrides);
  const { userId, profileId } = await userService.createUserWithProfile(
    payload
  );
  if (!userId) throw new Error("Fixture setup failed: no userId returned");
  return {
    userId,
    profileId,
    email: payload.user.email,
    username: payload.user.username,
    password: payload.user.password,
  };
}

describe("Auth Service Test", { tags: ["services/auth"] }, () => {
  // ---------------------------------------------------------------
  // Token issuance
  // ---------------------------------------------------------------

  describe("AuthService.createTokens", () => {
    test("signs an access + refresh token pair carrying the payload", () => {
      const payload = { id: crypto.randomUUID(), role: "USER" } as any;

      const { accessToken, refreshToken } = authService.createTokens(
        payload
      );

      expect(typeof accessToken).toBe("string");
      expect(typeof refreshToken).toBe("string");

      const decodedAccess = jwt.verify(
        accessToken,
        authConfig.JWT_ACCESS_TOKEN_SECRET
      ) as any;
      const decodedRefresh = jwt.verify(
        refreshToken,
        authConfig.JWT_REFRESH_TOKEN_SECRET
      ) as any;

      expect(decodedAccess.id).toBe(payload.id);
      expect(decodedAccess.role).toBe(payload.role);
      expect(decodedRefresh.id).toBe(payload.id);
      expect(decodedRefresh.role).toBe(payload.role);
    });
  });

  describe("AuthService.renewAccessToken / renewRefreshToken", () => {
    test("renews an access token carrying the full payload", () => {
      const payload = { id: crypto.randomUUID(), role: "ADMIN" } as any;

      const accessToken = authService.renewAccessToken(payload);
      const decoded = jwt.verify(
        accessToken,
        authConfig.JWT_ACCESS_TOKEN_SECRET
      ) as any;

      expect(decoded.id).toBe(payload.id);
      expect(decoded.role).toBe(payload.role);
    });

    test("renews a refresh token carrying only the id", () => {
      const payload = { id: crypto.randomUUID(), role: "USER" } as any;

      const refreshToken = authService.renewRefreshToken(payload);
      const decoded = jwt.verify(
        refreshToken,
        authConfig.JWT_REFRESH_TOKEN_SECRET
      ) as any;

      expect(decoded.id).toBe(payload.id);
      expect(decoded.role).toBeUndefined();
    });
  });

  describe("AuthService.getDataFromAccessToken / getDataFromRefreshToken", () => {
    test("decodes a valid access token back into its payload", () => {
      const payload = { id: crypto.randomUUID(), role: "USER" } as any;
      const { accessToken } = authService.createTokens(payload);

      const decoded = authService.getDataFromAccessToken(accessToken);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.role).toBe(payload.role);
    });

    test("decodes a valid refresh token back into its payload", () => {
      const payload = { id: crypto.randomUUID(), role: "USER" } as any;
      const { refreshToken } = authService.createTokens(payload);

      const decoded = authService.getDataFromRefreshToken(refreshToken);
      expect(decoded.id).toBe(payload.id);
    });

    test("throws when the access token is malformed", () => {
      expect(() =>
        authService.getDataFromAccessToken("not-a-real-token")
      ).toThrow();
    });

    test("throws when the token was signed with the wrong secret", () => {
      const badToken = jwt.sign({ id: crypto.randomUUID() }, "wrong-secret");

      expect(() => authService.getDataFromAccessToken(badToken)).toThrow();
      expect(() => authService.getDataFromRefreshToken(badToken)).toThrow();
    });
  });

  // ---------------------------------------------------------------
  // Cookies
  // ---------------------------------------------------------------

  describe("AuthService.getCookies", () => {
    test("reads access and refresh tokens from request cookies", () => {
      const req = {
        cookies: {
          [CookieService.ACCESS_TOKEN.name]: "access-value",
          [CookieService.REFRESH_TOKEN.name]: "refresh-value",
        },
      } as any;

      const { accessToken, refreshToken } = authService.getCookies(req);
      expect(accessToken).toBe("access-value");
      expect(refreshToken).toBe("refresh-value");
    });

    test("returns undefined for both tokens when no cookies are present", () => {
      const req = { cookies: {} } as any;

      const { accessToken, refreshToken } = authService.getCookies(req);
      expect(accessToken).toBeUndefined();
      expect(refreshToken).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------

  describe("AuthService.loginUser", () => {
    test("logs in with a correct email + password", async () => {
      const { email, password } = await createUser();

      const { accessToken, refreshToken } = await authService.loginUser({
        identifier: email,
        password,
      } as any);

      expect(typeof accessToken).toBe("string");
      expect(typeof refreshToken).toBe("string");
    });

    test("logs in with a correct username + password", async () => {
      const { username, password } = await createUser();

      const { accessToken } = await authService.loginUser({
        identifier: username,
        password,
      } as any);

      expect(typeof accessToken).toBe("string");
    });

    test("caches the logged-in user's data without the password field", async () => {
      const { email, password, userId } = await createUser();

      await authService.loginUser({ identifier: email, password } as any);

      expect(authRedis.cacheUserLoginData).toHaveBeenCalledTimes(1);
      const [cachedId, cachedData] = (authRedis.cacheUserLoginData as any)
        .mock.calls[0];
      expect(cachedId).toBe(userId);
      expect(cachedData).not.toHaveProperty("password");
    });

    test("throws when the identifier does not match any user", async () => {
      await expect(
        authService.loginUser({
          identifier: `nobody-${crypto.randomUUID()}@example.com`,
          password: "whatever",
        } as any)
      ).rejects.toThrow();

      expect(authRedis.cacheUserLoginData).not.toHaveBeenCalled();
    });

    test("throws when the password is incorrect", async () => {
      const { email } = await createUser();

      await expect(
        authService.loginUser({
          identifier: email,
          password: "WrongPassword1!",
        } as any)
      ).rejects.toThrow();

      expect(authRedis.cacheUserLoginData).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // Signup verification code
  // ---------------------------------------------------------------

  describe("AuthService.sendSignupCode", () => {
    test("sets a verification code for an unverified user and returns its id", async () => {
      const { userId } = await createUser();

      const result = await authService.sendSignupCode(userId as any);
      expect(result).toBe(userId);

      const [row] = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));
      expect(row?.verify_code).toBeTruthy();
      expect(row?.verify_expiry).toBeTruthy();
    });

    test("throws when the user is already verified", async () => {
      const { userId } = await createUser();

      await pgDb
        .update(usersTable)
        .set({ is_verified: true })
        .where(eq(usersTable.id, userId));

      await expect(
        authService.sendSignupCode(userId as any)
      ).rejects.toThrow();
    });

    test("throws when the user does not exist", async () => {
      await expect(
        authService.sendSignupCode(crypto.randomUUID() as any)
      ).rejects.toThrow();
    });
  });

  describe("AuthService.verifySignupCode", () => {
    test("verifies a user with a correct, unexpired code", async () => {
      const { userId } = await createUser();
      await authService.sendSignupCode(userId as any);

      const [row] = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      const result = await authService.verifySignupCode({
        id: userId,
        verify_code: row!.verify_code,
      } as any);
      expect(result).toBe(userId);

      const [updated] = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));
      expect(updated?.is_verified).toBe(true);
      expect(updated?.verify_code).toBeNull();
      expect(updated?.verify_expiry).toBeNull();
    });

    test("throws when the user is already verified", async () => {
      const { userId } = await createUser();
      await authService.sendSignupCode(userId as any);
      const [row] = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      await authService.verifySignupCode({
        id: userId,
        verify_code: row!.verify_code,
      } as any);

      await expect(
        authService.verifySignupCode({
          id: userId,
          verify_code: row!.verify_code,
        } as any)
      ).rejects.toThrow();
    });

    test("throws when the code is incorrect", async () => {
      const { userId } = await createUser();
      await authService.sendSignupCode(userId as any);

      await expect(
        authService.verifySignupCode({
          id: userId,
          verify_code: "000000",
        } as any)
      ).rejects.toThrow();
    });

    test("throws when the code has expired", async () => {
      const { userId } = await createUser();
      await authService.sendSignupCode(userId as any);
      const [row] = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      await pgDb
        .update(usersTable)
        .set({ verify_expiry: new Date(Date.now() - 60_000) })
        .where(eq(usersTable.id, userId));

      await expect(
        authService.verifySignupCode({
          id: userId,
          verify_code: row!.verify_code,
        } as any)
      ).rejects.toThrow();
    });

    test("throws when the user does not exist", async () => {
      await expect(
        authService.verifySignupCode({
          id: crypto.randomUUID(),
          verify_code: "123456",
        } as any)
      ).rejects.toThrow();
    });
  });
});