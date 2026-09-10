import "dotenv/config";
import { google } from "googleapis";
import type { TokenPayload } from "google-auth-library";
import { ApiError } from "@/libs";
import { getSystemCustomErrorMsgByKey } from "@/events";
import type { CreateUserWithProfileByProviderInputType } from "@/zod";

import { AuthRedis } from "@/redis";
import { generateRandomUsername } from "@/utils";
import type { IEmailService, OAuthService } from "@/blueprints";
import type { TokenService } from "./token.service";
import type { UserService } from "../user.service";

type GoogleOAuthServiceDepsType = {
  authRedis: AuthRedis;
  emailService: IEmailService;
  userService: UserService;
  tokenService: TokenService;
};

export class GoogleOAuthService implements OAuthService {
  private static CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  private static CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  private static REDIRECT_URI = process.env.GOOGLE_AUTH_REDIRECT_URI;

  private authRedis: AuthRedis;
  private emailService: IEmailService;
  private userService: UserService;
  private tokenService: TokenService;

  private static LoginScopes = [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  private oauthClient;

  constructor({
    authRedis,
    emailService,
    userService,
    tokenService,
  }: GoogleOAuthServiceDepsType) {
    this.authRedis = authRedis;
    this.emailService = emailService;
    this.userService = userService;
    this.tokenService = tokenService;

    this.oauthClient = new google.auth.OAuth2({
      client_id: GoogleOAuthService.CLIENT_ID!,
      client_secret: GoogleOAuthService.CLIENT_SECRET!,
      redirectUri: GoogleOAuthService.REDIRECT_URI!,
    });
  }

  generateAuthUrlForLogin() {
    return this.oauthClient.generateAuthUrl({
      access_type: "offline",
      scope: GoogleOAuthService.LoginScopes!,
      include_granted_scopes: true,
      prompt: "consent",
      redirect_uri: GoogleOAuthService.REDIRECT_URI!,
    });
  }

  async getIdTokensByAuthCode(authCode: string) {
    const { tokens } = await this.oauthClient.getToken(authCode);
    return {
      idToken: tokens.id_token,
    };
  }

  async getUserProfileByIdToken(
    idToken: string
  ): Promise<TokenPayload | undefined> {
    const data = await this.oauthClient.verifyIdToken({
      idToken,
    });

    return data.getPayload();
  }

  async loginOrSignup(code: string, deviceInfo: string) {
    if (!code)
      throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED"));

    const { idToken } = await this.getIdTokensByAuthCode(code as string);

    if (!idToken) {
      throw new ApiError(
        503,
        getSystemCustomErrorMsgByKey("SERVICE_UNAVAILABLE")
      );
    }

    const google_user = await this.getUserProfileByIdToken(idToken);

    const payload: CreateUserWithProfileByProviderInputType = {
      user: {
        email: google_user?.email as string,
        username: generateRandomUsername(),
        role: "USER",
        is_verified: google_user?.email_verified,
      },
      profile: {
        first_name: google_user?.name as string,
        avatar: google_user?.picture,
      },
    };

    const { profile, ...user } =
      await this.userService.createUserWithProfileByProvider(payload);

    const { tokenData, profileData } =
      this.tokenService.finalLoginResponseUserData(user, profile!);

    const tokens = this.tokenService.createTokens(tokenData);
    await this.authRedis.cacheUserLoginData(user?.id as string, {
      ...tokenData,
      ...profileData,
    });

    if (!payload.user.is_verified) {
      await this.emailService.sendSignupCode(user.email, deviceInfo);
    }

    return {
      tokens,
      user_id: user.id,
    };
  }
}
