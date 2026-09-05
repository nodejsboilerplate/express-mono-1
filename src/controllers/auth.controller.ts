import { UserRepository } from "@/database/repositories";
import { getSystemCustomErrorMsgByKey } from "@/events";
import { ApiError, ApiResponse } from "@/libs";
import { AuthRedis } from "@/redis";
import {
  AuthService,
  CookieService,
  EmailService,
  GoogleService,
} from "@/services";
import type {
  UserBasicInfoDataType,
  UserProfileDataByLoginType,
} from "@/types";
import type {
  CreateUserWithProfileInputType,
  EmailZType,
  IdZType,
  LoginUserInputType,
  VerifyCodeInputType,
} from "@/zod";
import type { Request, Response } from "express";

const authService = new AuthService();
const googleService = new GoogleService();
const emailService = new EmailService(); // Seperate Domain
const userRepository = new UserRepository();
const authRedis = new AuthRedis();

export class AuthController {
  async signupUserHandler(req: Request, res: Response): Promise<Response> {
    const {
      accessToken: existed_access_token,
      refreshToken: existed_refresh_token,
    } = authService.getCookies(req);

    if (existed_access_token || existed_refresh_token)
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("USER_ALREADY_EXISTS")
      );

    const payload = req.body as CreateUserWithProfileInputType;
    const result = await authService.signupUser(
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
    const { accessToken, refreshToken } = await authService.loginUser(
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
    const result = await emailService.sendSignupCode(
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

    const result = await authService.verifySignupCode({
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
    return res.redirect(googleService.generateAuthUrlForLogin());
  }

  async loginWithGoogleHandler(req: Request, res: Response) {
    const { code } = req.query as { code: string };
    const result = await googleService.login(
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

    let temp_profile: UserProfileDataByLoginType;

    const get_cached_data = await authRedis.getCachedLoginData(id);
    const parse_data = JSON.parse(
      String(get_cached_data)
    ) as UserBasicInfoDataType;

    if (!parse_data) {
      const existedUser =
        await userRepository.GetUserDataForLoginByEmailOrUsernameOrId(id);
      if (!existedUser?.id) {
        throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED"));
      }

      temp_profile = existedUser.profile!;
    } else {
      temp_profile = {
        avatar: parse_data.avatar,
        first_name: parse_data.first_name,
        last_name: parse_data.last_name,
        nickname: parse_data.nickname,
      };
    }

    return res
      .status(200)
      .json(new ApiResponse(200, "OK", { ...user, ...temp_profile }));
  }
}
