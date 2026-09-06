import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoogleService } from "@/services/google.service";

// ---------------------------------------------------------
// Hoisted shared mock fns
// ---------------------------------------------------------
const mocks = vi.hoisted(() => ({
  generateAuthUrl: vi.fn(),
  getToken: vi.fn(),
  verifyIdToken: vi.fn(),
  createUserWithProfileByProvider: vi.fn(),
  cacheUserLoginData: vi.fn(),
  finalLoginResponseUserData: vi.fn(),
  generateRandomUsername: vi.fn(),
  createTokens: vi.fn(),
  sendSignupVerificationEmail: vi.fn(),
  getCookies: vi.fn(),
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
  finalLoginResponseUserData: mocks.finalLoginResponseUserData,
  generateRandomUsername: mocks.generateRandomUsername,
}));

vi.mock("@/redis", () => ({
  AuthRedis: class {
    cacheUserLoginData = mocks.cacheUserLoginData;
  },
}));

vi.mock("@/services/user.service", () => ({
  UserService: class {
    createUserWithProfileByProvider = mocks.createUserWithProfileByProvider;
  },
}));

// GoogleService extends AuthService — mock the base class so login() only
// exercises GoogleService's own logic, not AuthService internals.
vi.mock("@/services/auth.service", () => ({
  AuthService: class {
    getCookies = mocks.getCookies;
    createTokens = mocks.createTokens;
    sendSignupVerificationEmail = mocks.sendSignupVerificationEmail;
  },
}));

const ApiErrorLike = (status: number, message: string) => {
  const e: any = new Error(message);
  e.status = status;
  return e;
};

describe("GoogleService", () => {
  let googleService: GoogleService;

  beforeEach(() => {
    vi.clearAllMocks();
    googleService = new GoogleService();
  });

  // -------------------------------------------------------
  describe("generateAuthUrlForLogin", () => {
    it("generates a Google OAuth consent URL with offline access + profile/email scopes", () => {
      mocks.generateAuthUrl.mockReturnValueOnce(
        "https://accounts.google.com/consent"
      );

      const url = googleService.generateAuthUrlForLogin();

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

      const result = await googleService.getIdTokensByAuthCode("auth-code");

      expect(mocks.getToken).toHaveBeenCalledWith("auth-code");
      expect(result).toEqual({ idToken: "id.jwt" });
    });
  });

  // -------------------------------------------------------
  describe("getUserProfileByIdToken", () => {
    it("returns the decoded token payload", async () => {
      const payload = { email: "a@b.com", name: "A B", picture: "pic.png" };
      mocks.verifyIdToken.mockResolvedValueOnce({ getPayload: () => payload });

      const result = await googleService.getUserProfileByIdToken("id.jwt");

      expect(mocks.verifyIdToken).toHaveBeenCalledWith({ idToken: "id.jwt" });
      expect(result).toEqual(payload);
    });
  });

  // -------------------------------------------------------
  describe("login", () => {
    it("throws 401 when no code is provided", async () => {
      await expect(googleService.login("", "device")).rejects.toThrow(
        "UNAUTHORIZED"
      );
    });

    it("throws 503 when no id token is returned from Google", async () => {
      mocks.getToken.mockResolvedValueOnce({ tokens: {} });
      await expect(googleService.login("code", "device")).rejects.toThrow(
        "SERVICE_UNAVAILABLE"
      );
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
      mocks.createUserWithProfileByProvider.mockResolvedValueOnce({
        id: "u1",
        email: "a@b.com",
        profile: { id: "p1", first_name: "A B" },
      });
      mocks.finalLoginResponseUserData.mockReturnValueOnce({
        tokenData: { id: "u1" },
        profileData: { first_name: "A B" },
      });
      mocks.createTokens.mockReturnValueOnce({
        accessToken: "access.jwt",
        refreshToken: "refresh.jwt",
      });

      const result = await googleService.login("code", "device-x");

      expect(mocks.createUserWithProfileByProvider).toHaveBeenCalledWith(
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
      expect(mocks.cacheUserLoginData).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({ id: "u1", first_name: "A B" })
      );
      expect(mocks.sendSignupVerificationEmail).not.toHaveBeenCalled();
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
      mocks.createUserWithProfileByProvider.mockResolvedValueOnce({
        id: "u2",
        email: "unverified@b.com",
        profile: { id: "p2" },
      });
      mocks.finalLoginResponseUserData.mockReturnValueOnce({
        tokenData: { id: "u2" },
        profileData: {},
      });
      mocks.createTokens.mockReturnValueOnce({
        accessToken: "access2.jwt",
        refreshToken: "refresh2.jwt",
      });

      await googleService.login("code", "device-x");

      expect(mocks.sendSignupVerificationEmail).toHaveBeenCalledWith(
        "unverified@b.com",
        "device-x"
      );
    });
  });
});
