import jwt from "jsonwebtoken";
import type { Request } from "express";
import {
  ACCESS_TOKEN_EXPIRY_SEC,
  CookieService,
  REFRESH_TOKEN_EXPIRY_SEC,
} from "./cookie.service";
import { authConfig } from "@/config";
import type {
  AccessTokenPayload,
  CookieNames,
  RefreshTokenPayload,
} from "@/types";
import type { IdZType, LoginUserInputType, VerifyCodeInputType } from "@/zod";
import { userInputValidators } from "@/validators/inputs";
import {
  generateVerificationCode,
  getVerifyExpiry,
  isZodError,
  validationError,
} from "@/utils";
import { getSystemCustomErrorMsgByKey } from "@/events";
import { ApiError } from "@/libs";
import bcrypt from "bcryptjs";
import { AuthRedis } from "@/redis";
import { UserRepository } from "@/database/repositories";

const userRepository = new UserRepository();
const authRedis = new AuthRedis();

export class AuthService {
  createTokens(payload: AccessTokenPayload): CookieNames {
    const accessToken = jwt.sign(payload, authConfig.JWT_ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY_SEC,
    });

    const refreshToken = jwt.sign(
      {
        id: payload.id,
        role: payload.role,
      } as RefreshTokenPayload,
      authConfig.JWT_REFRESH_TOKEN_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY_SEC }
    );

    return { accessToken, refreshToken };
  }
  renewAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, authConfig.JWT_ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY_SEC,
    });
  }

  renewRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign({ id: payload.id }, authConfig.JWT_REFRESH_TOKEN_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY_SEC,
    });
  }

  getDataFromAccessToken(token: string): AccessTokenPayload {
    const decoded = jwt.verify(
      token,
      authConfig.JWT_ACCESS_TOKEN_SECRET
    ) as AccessTokenPayload;
    return decoded;
  }
  getDataFromRefreshToken(token: string): RefreshTokenPayload {
    const decoded = jwt.verify(
      token,
      authConfig.JWT_REFRESH_TOKEN_SECRET
    ) as RefreshTokenPayload;
    return decoded;
  }

  getCookies(req: Request): CookieNames {
    const refresh_token = req.cookies?.[CookieService.REFRESH_TOKEN.name];
    const access_token = req.cookies?.[CookieService.ACCESS_TOKEN.name];
    return {
      accessToken: access_token,
      refreshToken: refresh_token,
    };
  }

  async loginUser(
    payload: LoginUserInputType
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const parse_payload = userInputValidators.loginUserInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const result = await userRepository.GetUserDataForLoginByEmailOrUsername(
      parse_payload.identifier
    );

    if (!result?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("USER_NOT_FOUND"));
    }

    const isPassMatched = await bcrypt.compare(
      parse_payload.password,
      result.password
    );
    if (!isPassMatched) {
      throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED"));
    }

    const { accessToken, refreshToken } = this.createTokens(result);

    const { password, ...rest } = result;

    await authRedis.cacheUserLoginData(result?.id as string, rest);

    return {
      accessToken,
      refreshToken,
    };
  }

  async sendSignupCode(payload: IdZType): Promise<string> {
    const parse_id = userInputValidators.idInput(payload);
    if (isZodError(parse_id)) throw validationError(parse_id);

    const verify_code = generateVerificationCode();
    const verify_expiry = getVerifyExpiry();

    const user = await userRepository.SetVerifyCodeForLogin(
      verify_code,
      verify_expiry,
      parse_id
    );

    if (!user) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("USER_NOT_FOUND"));
    }

    return user.id;
  }

  async verifySignupCode(payload: VerifyCodeInputType): Promise<string> {
    const parse_payload = userInputValidators.verifyCodeInput(payload);
    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const user = await userRepository.GetUserVerifyDetails(parse_payload.id);

    if (!user) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("USER_NOT_FOUND"));
    }

    if (user.is_verified) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("USER_ALREADY_VERIFIED")
      );
    }

    if (!user.verify_code || user.verify_code !== parse_payload.verify_code) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("INVALID_VERIFICATION_CODE")
      );
    }

    if (!user.verify_expiry || user.verify_expiry.getTime() < Date.now()) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("VERIFICATION_CODE_EXPIRED")
      );
    }

    const verifiedUser = await userRepository.UpdateUserVerifyDetails(
      user.id
    );

    if (!verifiedUser?.id) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("USER_UPDATE_FAILED")
      );
    }

    return verifiedUser.id;
  }
}
