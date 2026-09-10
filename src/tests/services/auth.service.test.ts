import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "@/services/auth/auth.service";

// ---------------------------------------------------------
// AuthService constructs its own ManualAuthService and GoogleOAuthService
// internally (they are NOT injected), so those two are mocked via their
// real module aliases (not relative paths — this test file doesn't live
// next to auth.service.ts, so a relative specifier would silently miss).
// Everything AuthService itself takes via constructor injection
// (authRedis, tokenService, userRepository, etc.) is passed as plain
// mock objects with no vi.mock() needed.
// ---------------------------------------------------------
const mocks = vi.hoisted(() => ({
  manualAuthCtor: vi.fn(),
  googleOAuthCtor: vi.fn(),
}));

vi.mock("@/services/auth/manual-auth.service", () => ({
  ManualAuthService: class {
    constructor(deps: unknown) {
      mocks.manualAuthCtor(deps);
    }
  },
}));

vi.mock("@/services/auth/google-auth.service", () => ({
  GoogleOAuthService: class {
    constructor(deps: unknown) {
      mocks.googleOAuthCtor(deps);
    }
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

const buildDeps = () => ({
  authRedis: {
    getCachedLoginData: vi.fn(),
    cacheUserLoginData: vi.fn(),
  },
  emailService: {
    sendSignupCode: vi.fn(),
    sendContactEmailVerificationCode: vi.fn(),
  },
  tokenService: {
    finalLoginResponseUserData: vi.fn(),
  },
  userInputValidators: {},
  userRepository: {
    GetUserDataForLoginByEmailOrUsernameOrId: vi.fn(),
  },
  userService: {},
});

describe("AuthService", () => {
  let deps: ReturnType<typeof buildDeps>;
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = buildDeps();
    authService = new AuthService(deps as any);
  });

  // -------------------------------------------------------
  describe("construction / wiring", () => {
    it("constructs manualAuth with authRedis, emailService, tokenService, userInputValidators, userRepository, userService", () => {
      expect(mocks.manualAuthCtor).toHaveBeenCalledWith(
        expect.objectContaining({
          authRedis: deps.authRedis,
          emailService: deps.emailService,
          tokenService: deps.tokenService,
          userInputValidators: deps.userInputValidators,
          userRepository: deps.userRepository,
          userService: deps.userService,
        })
      );
      expect(authService.manualAuth).toBeInstanceOf(Object);
    });

    it("constructs googleOAuth with authRedis, emailService, userService, tokenService", () => {
      expect(mocks.googleOAuthCtor).toHaveBeenCalledWith(
        expect.objectContaining({
          authRedis: deps.authRedis,
          emailService: deps.emailService,
          userService: deps.userService,
          tokenService: deps.tokenService,
        })
      );
      expect(authService.googleOAuth).toBeInstanceOf(Object);
    });
  });

  // -------------------------------------------------------
  describe("getAuthUserData", () => {
    it("returns the cached data directly on a Redis cache hit", async () => {
      const cached = {
        id: "u1",
        email: "a@b.com",
        username: "rahim_uddin",
        is_verified: true,
        avatar: "https://cdn.example.com/a.png",
        first_name: "Rahim",
        last_name: "Uddin",
        nickname: "Ray",
      };
      deps.authRedis.getCachedLoginData.mockResolvedValueOnce(
        JSON.stringify(cached)
      );

      const result = await authService.getAuthUserData("u1");

      expect(result).toEqual(cached);
      expect(
        deps.userRepository.GetUserDataForLoginByEmailOrUsernameOrId
      ).not.toHaveBeenCalled();
      expect(deps.authRedis.cacheUserLoginData).not.toHaveBeenCalled();
    });

    it("falls back to the repository + caches the result on a cache miss", async () => {
      // Redis returns null for a missing key -> String(null) === "null" -> JSON.parse("null") === null (falsy)
      deps.authRedis.getCachedLoginData.mockResolvedValueOnce(null);
      deps.userRepository.GetUserDataForLoginByEmailOrUsernameOrId.mockResolvedValueOnce(
        {
          id: "u1",
          email: "a@b.com",
          username: "rahim_uddin",
          is_verified: true,
          profile: {
            first_name: "Rahim",
            last_name: "Uddin",
            avatar: "avatar.png",
            nickname: "Ray",
          },
        }
      );
      deps.tokenService.finalLoginResponseUserData.mockReturnValueOnce({
        tokenData: {
          id: "u1",
          email: "a@b.com",
          username: "rahim_uddin",
          is_verified: true,
        },
        profileData: {
          first_name: "Rahim",
          last_name: "Uddin",
          avatar: "avatar.png",
          nickname: "Ray",
        },
      });

      const result = await authService.getAuthUserData("u1");

      expect(
        deps.userRepository.GetUserDataForLoginByEmailOrUsernameOrId
      ).toHaveBeenCalledWith("u1");
      expect(deps.authRedis.cacheUserLoginData).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({ id: "u1", first_name: "Rahim" })
      );
      expect(result).toEqual({
        id: "u1",
        email: "a@b.com",
        username: "rahim_uddin",
        is_verified: true,
        first_name: "Rahim",
        last_name: "Uddin",
        avatar: "avatar.png",
        nickname: "Ray",
      });
    });

    it("throws 401 when the user cannot be found in the repository", async () => {
      deps.authRedis.getCachedLoginData.mockResolvedValueOnce(null);
      deps.userRepository.GetUserDataForLoginByEmailOrUsernameOrId.mockResolvedValueOnce(
        undefined
      );

      await expect(authService.getAuthUserData("u1")).rejects.toThrow(
        "UNAUTHORIZED"
      );
      expect(deps.authRedis.cacheUserLoginData).not.toHaveBeenCalled();
    });
  });
});
