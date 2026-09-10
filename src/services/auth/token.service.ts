import type {
  AccessTokenPayload,
  CookieNames,
  RefreshTokenPayload,
  UserProfileDataByLoginType,
} from "@/types";
import {
  ACCESS_TOKEN_EXPIRY_SEC,
  CookieService,
  REFRESH_TOKEN_EXPIRY_SEC,
} from "../cookie.service";
import { getSystemCustomErrorMsgByKey } from "@/events";
import { ApiError } from "@/libs";
import jwt from "jsonwebtoken";
import { authConfig } from "@/config";
import type { Request } from "express";

export class TokenService {
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

  getDataFromAccessToken(token: string): AccessTokenPayload | null {
    try {
      const decoded = jwt.verify(
        token,
        authConfig.JWT_ACCESS_TOKEN_SECRET
      ) as AccessTokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }
  getDataFromRefreshToken(token: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(
        token,
        authConfig.JWT_REFRESH_TOKEN_SECRET
      ) as RefreshTokenPayload;
      return decoded;
    } catch (error) {
      throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED"));
    }
  }

  getCookies(req: Request): CookieNames {
    const refresh_token = req.cookies?.[CookieService.REFRESH_TOKEN.name];
    const access_token = req.cookies?.[CookieService.ACCESS_TOKEN.name];
    return {
      accessToken: access_token,
      refreshToken: refresh_token,
    };
  }

  finalLoginResponseUserData = (
    user: AccessTokenPayload,
    profile: UserProfileDataByLoginType
  ) => {
    const tokenData: AccessTokenPayload = {
      email: user.email,
      id: user.id,
      is_verified: user.is_verified,
      role: user.role,
      username: user.username,
    };

    const profileData: UserProfileDataByLoginType = {
      avatar: profile?.avatar,
      first_name: profile?.first_name,
      last_name: profile?.last_name,
      nickname: profile?.nickname,
    };

    return {
      tokenData,
      profileData,
    };
  };
}
