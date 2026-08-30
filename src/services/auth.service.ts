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

export class AuthService {
  private static instance: AuthService;

  static create() {
    if (this.instance) {
      return this.instance;
    }

    this.instance = new AuthService();
    return this.instance;
  }

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
}
