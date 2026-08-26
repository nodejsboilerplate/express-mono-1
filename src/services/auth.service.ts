import jwt from "jsonwebtoken";
import {
  ACCESS_TOKEN_EXPIRY_SEC,
  REFRESH_TOKEN_EXPIRY_SEC,
} from "./cookie.service";
import { authConfig } from "@/config";
import type { AccessTokenPayload, RefreshTokenPayload } from "@/types";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthServiceType {
  createTokens(payload: AccessTokenPayload): TokenPair;
  renewAccessToken(payload: AccessTokenPayload, refreshToken: string): string;
  renewRefreshToken(payload: RefreshTokenPayload): string;
  getDataFromAccessToken(token: string): AccessTokenPayload;
  getDataFromRefreshToken(token: string): RefreshTokenPayload;
}

export class AuthService implements AuthServiceType {
  createTokens(payload: AccessTokenPayload): TokenPair {
    const accessToken = jwt.sign(payload, authConfig.JWT_ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY_SEC,
    });

    const refreshToken = jwt.sign(
      payload,
      authConfig.JWT_REFRESH_TOKEN_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY_SEC }
    );

    return { accessToken, refreshToken };
  }
  renewAccessToken(payload: AccessTokenPayload, refreshToken: string): string {
    // re-fetch user by decoded.id in caller if you need fresh email/role/username
    return jwt.sign(payload, authConfig.JWT_ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY_SEC,
    });
  }

  renewRefreshToken(payload: RefreshTokenPayload): string {
    // const decoded = jwt.verify(refreshToken, authConfig.JWT_REFRESH_TOKEN_SECRET) as { id: string };
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
}

export const authService = new AuthService();
