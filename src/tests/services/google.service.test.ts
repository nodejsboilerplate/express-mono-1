import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoogleOAuthService } from "@/services/auth";

const mocks = vi.hoisted(() => ({
  generateAuthUrl: vi.fn(),
  getToken: vi.fn(),
  verifyIdToken: vi.fn(),
  generateRandomUsername: vi.fn(),
}));

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: class {
        generateAuthUrl = mocks.generateAuthUrl;
        getToken = mocks.getToken;
        verifyIdToken = mocks.verifyIdToken;
        constructor(_opts: unknown) {}
      },
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
}));

vi.mock("@/utils", () => ({
  generateRandomUsername: mocks.generateRandomUsername,
}));

const buildDeps = () => ({
  authRedis: {
    cacheUserLoginData: vi.fn(),
  },
  emailService: {
    sendSignupCode: vi.fn(),
  },
  userService: {
    createUserWithProfileByProvider: vi.fn(),
  },
  tokenService: {
    finalLoginResponseUserData: vi.fn(),
    createTokens: vi.fn(),
  },
});

describe("GoogleOAuthService", () => {
  let deps: ReturnType<typeof buildDeps>;
  let googleOAuthService: GoogleOAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = buildDeps();
    googleOAuthService = new GoogleOAuthService(deps as any);
  });

  // -------------------------------------------------------
  describe("generateAuthUrlForLogin", () => {
    it("generates a Google OAuth consent URL with offline access + profile/email scopes", () => {
      mocks.generateAuthUrl.mockReturnValueOnce(
        "https://accounts.google.com/consent"
      );

      const url = googleOAuthService.generateAuthUrlForLogin();

      expect(mocks.generateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          access_type: "offline",
          prompt: "consent",
          scope: expect.arrayContaining([
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
          ]),
        })
      );
      expect(url).toBe("https://accounts.google.com/consent");
    });
  });

  // -------------------------------------------------------
  describe("getIdTokensByAuthCode", () => {
    it("exchanges an auth code for an id token", async () => {
      mocks.getToken.mockResolvedValueOnce({ tokens: { id_token: "id.jwt" } });

      const result =
        await googleOAuthService.getIdTokensByAuthCode("auth-code");

      expect(mocks.getToken).toHaveBeenCalledWith("auth-code");
      expect(result).toEqual({ idToken: "id.jwt" });
    });
  });

  // -------------------------------------------------------
  describe("getUserProfileByIdToken", () => {
    it("returns the decoded token payload", async () => {
      const payload = { email: "a@b.com", name: "A B", picture: "pic.png" };
      mocks.verifyIdToken.mockResolvedValueOnce({ getPayload: () => payload });

      const result = await googleOAuthService.getUserProfileByIdToken("id.jwt");

      expect(mocks.verifyIdToken).toHaveBeenCalledWith({ idToken: "id.jwt" });
      expect(result).toEqual(payload);
    });
  });

  // -------------------------------------------------------
  describe("loginOrSignup", () => {
    it("throws 401 when no code is provided", async () => {
      await expect(
        googleOAuthService.loginOrSignup("", "device")
      ).rejects.toThrow("UNAUTHORIZED");
    });

    it("throws 503 when no id token is returned from Google", async () => {
      mocks.getToken.mockResolvedValueOnce({ tokens: {} });
      await expect(
        googleOAuthService.loginOrSignup("code", "device")
      ).rejects.toThrow("SERVICE_UNAVAILABLE");
    });

    it("creates/links the user, caches login data, and returns tokens for a verified Google account", async () => {
      mocks.getToken.mockResolvedValueOnce({ tokens: { id_token: "id.jwt" } });
      mocks.verifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          email: "a@b.com",
          email_verified: true,
          name: "A B",
          picture: "pic.png",
        }),
      });
      mocks.generateRandomUsername.mockReturnValueOnce("random_user_1");
      deps.userService.createUserWithProfileByProvider.mockResolvedValueOnce({
        id: "u1",
        email: "a@b.com",
        profile: { id: "p1", first_name: "A B" },
      });
      deps.tokenService.finalLoginResponseUserData.mockReturnValueOnce({
        tokenData: { id: "u1" },
        profileData: { first_name: "A B" },
      });
      deps.tokenService.createTokens.mockReturnValueOnce({
        accessToken: "access.jwt",
        refreshToken: "refresh.jwt",
      });

      const result = await googleOAuthService.loginOrSignup("code", "device-x");

      expect(
        deps.userService.createUserWithProfileByProvider
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            email: "a@b.com",
            username: "random_user_1",
            role: "USER",
            is_verified: true,
          }),
          profile: expect.objectContaining({
            first_name: "A B",
            avatar: "pic.png",
          }),
        })
      );
      expect(deps.tokenService.finalLoginResponseUserData).toHaveBeenCalledWith(
        { id: "u1", email: "a@b.com" },
        { id: "p1", first_name: "A B" }
      );
      expect(deps.authRedis.cacheUserLoginData).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({ id: "u1", first_name: "A B" })
      );
      expect(deps.emailService.sendSignupCode).not.toHaveBeenCalled();
      expect(result).toEqual({
        tokens: { accessToken: "access.jwt", refreshToken: "refresh.jwt" },
        user_id: "u1",
      });
    });

    it("sends a signup verification email when the Google account email is unverified", async () => {
      mocks.getToken.mockResolvedValueOnce({ tokens: { id_token: "id.jwt" } });
      mocks.verifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          email: "unverified@b.com",
          email_verified: false,
          name: "New User",
          picture: "pic.png",
        }),
      });
      mocks.generateRandomUsername.mockReturnValueOnce("random_user_2");
      deps.userService.createUserWithProfileByProvider.mockResolvedValueOnce({
        id: "u2",
        email: "unverified@b.com",
        profile: { id: "p2" },
      });
      deps.tokenService.finalLoginResponseUserData.mockReturnValueOnce({
        tokenData: { id: "u2" },
        profileData: {},
      });
      deps.tokenService.createTokens.mockReturnValueOnce({
        accessToken: "access2.jwt",
        refreshToken: "refresh2.jwt",
      });

      await googleOAuthService.loginOrSignup("code", "device-x");

      expect(deps.emailService.sendSignupCode).toHaveBeenCalledWith(
        "unverified@b.com",
        "device-x"
      );
    });

    it("returns the existing account's tokens without re-sending a signup email when the user already exists", async () => {
      mocks.getToken.mockResolvedValueOnce({ tokens: { id_token: "id.jwt" } });
      mocks.verifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          email: "existing@b.com",
          email_verified: true,
          name: "Existing User",
          picture: "pic.png",
        }),
      });

      deps.userService.createUserWithProfileByProvider.mockResolvedValueOnce({
        id: "u3",
        email: "existing@b.com",
        is_verified: true,
        profile: { id: "p3", first_name: "Existing User" },
      });
      deps.tokenService.finalLoginResponseUserData.mockReturnValueOnce({
        tokenData: { id: "u3" },
        profileData: { first_name: "Existing User" },
      });
      deps.tokenService.createTokens.mockReturnValueOnce({
        accessToken: "access3.jwt",
        refreshToken: "refresh3.jwt",
      });

      const result = await googleOAuthService.loginOrSignup("code", "device-x");

      expect(deps.emailService.sendSignupCode).not.toHaveBeenCalled();
      expect(result.user_id).toBe("u3");
    });
  });
});
