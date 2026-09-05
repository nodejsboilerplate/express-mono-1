import "dotenv/config";
import { google } from "googleapis";
import type { TokenPayload } from "google-auth-library";
import { ApiError } from "@/libs";
import { getSystemCustomErrorMsgByKey } from "@/events";
import type { CreateUserWithProfileByProviderInputType } from "@/zod";
import { AuthService } from "./auth.service";
import { UserService } from "./user.service";
import { AuthRedis } from "@/redis";
import type { AccessTokenPayload } from "@/types";
import { generateRandomUsername } from "@/utils";
import { EmailService } from "./email.service";

const userService = new UserService();
const authRedis = new AuthRedis();
const emailService = new EmailService()

export class GoogleService extends AuthService {
  private static CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  private static CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  private static REDIRECT_URI = process.env.GOOGLE_AUTH_REDIRECT_URI;

  private static LoginScopes = [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  private oauthClient;

  constructor() {
    super();
    this.oauthClient = new google.auth.OAuth2({
      client_id: GoogleService.CLIENT_ID!,
      client_secret: GoogleService.CLIENT_SECRET!,
      redirectUri: GoogleService.REDIRECT_URI!,
    });
  }

  generateAuthUrlForLogin() {
    return this.oauthClient.generateAuthUrl({
      access_type: "offline",
      scope: GoogleService.LoginScopes!,
      include_granted_scopes: true,
      prompt: "consent",
      redirect_uri: GoogleService.REDIRECT_URI!,
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

  async login(code: string, deviceInfo: string) {
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

    console.log("Hello mahin: ", payload)
    const user = await userService.createUserWithProfileByProvider(payload);

    const data: AccessTokenPayload = {
      email: user.email,
      id: user.id,
      is_verified: user.is_verified,
      role: user.role,
      username: user.username,
    };

    const tokens = this.createTokens(data);
    await authRedis.cacheUserLoginData(user?.id as string, data);

    if (!payload.user.is_verified) {
      await emailService.sendSignupCode(user.email, deviceInfo);
    }

    return {
      tokens,
      user_id: user.id,
    };
  }
}
