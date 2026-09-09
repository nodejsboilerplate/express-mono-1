import type { IEmailService } from "@/blueprints";
import { getSystemCustomErrorMsgByKey } from "@/events";
import { ApiError, ApiResponse } from "@/libs";
import { CookieService } from "@/services";
import type { AuthService } from "@/services/auth/auth.service";
import type { TokenService } from "@/services/auth/token.service";
import { VerificationService } from "@/services/verification.service";
import type { UserProfileDataByLoginType } from "@/types";
import type {
  CreateUserWithProfileInputType,
  LoginUserInputType,
  VerifyCodeInputType,
} from "@/zod";
import type { Request, Response } from "express";

type AuthControllerDepsType = {
  authService: AuthService;
  tokenService: TokenService;
  verificationService: VerificationService;
  emailService: IEmailService;
};

export class AuthController {
  private authService: AuthService;
  private tokenService: TokenService;
  private verificationService: VerificationService;
  private emailService: IEmailService;

  constructor({
    authService,
    tokenService,
    verificationService,
    emailService,
  }: AuthControllerDepsType) {
    this.authService = authService;
    this.tokenService = tokenService;
    this.verificationService = verificationService;
    this.emailService = emailService;
  }

  async signupUserHandler(req: Request, res: Response): Promise<Response> {
    const {
      accessToken: existed_access_token,
      refreshToken: existed_refresh_token,
    } = this.tokenService.getCookies(req);

    if (existed_access_token || existed_refresh_token)
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("USER_ALREADY_EXISTS")
      );

    const payload = req.body as CreateUserWithProfileInputType;
    const result = await this.authService.manualAuth.signupByManual(
      payload,
      req?.headers["user-agent"] ?? "Unknown device"
    );
    const { accessToken, refreshToken } = result.tokens;

    res.cookie(
      CookieService.ACCESS_TOKEN.name,
      accessToken,
      CookieService.ACCESS_TOKEN.cookie
    );

    res.cookie(
      CookieService.REFRESH_TOKEN.name,
      refreshToken,
      CookieService.REFRESH_TOKEN.cookie
    );

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          "Account created successfully. Please verify your account using the code sent to you.",
          { id: result.user_id }
        )
      );
  }

  async loginUserHandler(req: Request, res: Response): Promise<Response> {
    const payload = req.body as LoginUserInputType;
    const { accessToken, refreshToken } =
      await this.authService.manualAuth.loginByManual(
        payload,
        req?.headers["user-agent"] ?? "Unknown device"
      );

    res.cookie(
      CookieService.ACCESS_TOKEN.name,
      accessToken,
      CookieService.ACCESS_TOKEN.cookie
    );

    res.cookie(
      CookieService.REFRESH_TOKEN.name,
      refreshToken,
      CookieService.REFRESH_TOKEN.cookie
    );

    return res.status(200).json(new ApiResponse(200, "Login Successful."));
  }

  async resendSignupCodeHandler(
    req: Request,
    res: Response
  ): Promise<Response> {
    const result = await this.emailService.sendSignupCode(
      req.auth_user.email,
      req?.headers["user-agent"] ?? "Unknown device"
    );

    return res.status(200).json(
      new ApiResponse(200, "Verification code sent successfully.", {
        id: result,
      })
    );
  }

  async verifySignupCodeHandler(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { verify_code } = req.body as Pick<
      VerifyCodeInputType,
      "verify_code"
    >;

    if (req.auth_user.is_verified) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("USER_ALREADY_VERIFIED")
      );
    }

    const result = await this.verificationService.verifySignupCode({
      verify_code,
      id: req.auth_user.id,
    });

    return res.status(200).json(
      new ApiResponse(200, "Account verified successfully.", {
        id: result,
      })
    );
  }

  async redirectGoogleAuthHandler(req: Request, res: Response) {
    return res.redirect(this.authService.googleOAuth.generateAuthUrlForLogin());
  }

  async loginWithGoogleHandler(req: Request, res: Response) {
    const { code } = req.query as { code: string };
    const result = await this.authService.googleOAuth.loginOrSignup(
      code,
      req?.headers["user-agent"] ?? "Unknown device"
    );
    const { accessToken, refreshToken } = result.tokens;

    res.cookie(
      CookieService.ACCESS_TOKEN.name,
      accessToken,
      CookieService.ACCESS_TOKEN.cookie
    );

    res.cookie(
      CookieService.REFRESH_TOKEN.name,
      refreshToken,
      CookieService.REFRESH_TOKEN.cookie
    );

    return res
      .status(201)
      .json(new ApiResponse(200, "OK", { id: result.user_id }));
  }

  async authUserBasicDataProvider(req: Request, res: Response) {
    const { id, role, ...user } = req.auth_user;

    const auth_user = await this.authService.getAuthUserData(id);
    const profile: UserProfileDataByLoginType = {
      avatar: auth_user.avatar,
      first_name: auth_user.first_name,
      last_name: auth_user.last_name,
      nickname: auth_user.nickname,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, "OK", { ...user, ...profile }));
  }
}
