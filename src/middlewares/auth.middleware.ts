import { authConfig } from "@/config";
import { usersTable } from "@/database";
import { getSystemCustomErrorMsgByKey } from "@/events";
import { ApiError } from "@/libs";
import { pgDb } from "@/libs/db.connect";
import { userRedisManager } from "@/redis";
import { authService } from "@/services";
import {
  ACCESS_TOKEN_EXPIRY_SEC,
  CookieService,
} from "@/services/cookie.service";
import type { AccessTokenPayload } from "@/types";
import { getDbRecord } from "@/utils/drizzle-query";

import { and, eq, sql } from "drizzle-orm";
import type { NextFunction, Response, Request } from "express";
import jwt from "jsonwebtoken";

/**
 * Middleware to enforce authentication and manage token rotation.
 *
 * Logic Flow:
 * 1. Attempt to verify the Access Token for immediate authentication (High performance).
 * 2. If Access Token is expired/invalid, attempt to verify the Refresh Token.
 * 3. Validate user status and 'ADMIN' role via Redis (Cache) or PostgreSQL (Prepared Statement).
 * 4. Perform a 'Silent Refresh' by issuing a new Access Token if the Refresh Token is valid.
 *
 * @throws {ApiError} 401 Unauthorized if both tokens are invalid or user lacks Admin permissions.
 */
export const AuthMiddlware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { accessToken, refreshToken } = authService.getCookies(req);

    // console.log("cookies are: ", accessToken, refreshToken);

    /**
     * Fast-Path (Access Token)
     * If a valid Access Token exists, we trust the signed payload to avoid DB/Redis latency.
     */
    if (accessToken) {
      try {
        const decode_data = authService.getDataFromAccessToken(accessToken);

        // Strict Requirement: Only ADMINs can pass this guard
        if (decode_data.role == "ADMIN") {
          req.auth_user = decode_data;
          // console.log("Token not refreshed", req.user);
          return next();
        }
      } catch {
        // Access token expired or tampered; fall through to Refresh Token logic
      }
    }

    /**
     * Silent Refresh (Refresh Token)
     * If we reach here, the Access Token is missing or invalid.
     */
    if (!refreshToken) {
      throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED")!);
    }

    let decoded;
    try {
      decoded = authService.getDataFromRefreshToken(refreshToken);
    } catch (err) {
      throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED")!);
    }

    /**
     * User Validation Layer
     * To ensure the user hasn't been banned or had their role changed,
     * we verify identity against our storage layers.
     */
    let temp_user: AccessTokenPayload;

    // Redis Lookup
    const get_cached_data = await userRedisManager.getCachedLoginData(
      decoded.id
    );

    if (!get_cached_data) {
      const [result] = await getDbRecord(
        usersTable,
        ["id", "email", "username", "role", "is_verified"],
        [
          {
            type: "eq",
            data: {
              id: decoded.id,
              role: "USER",
            },
          },
        ],
        pgDb
      );
      temp_user = result as AccessTokenPayload;
    } else {
      temp_user = {
        id: get_cached_data.id,
        username: get_cached_data.username,
        email: get_cached_data.email,
        role: get_cached_data.role,
        is_verified: get_cached_data.is_verified,
      };
    }

  
    if (!temp_user || temp_user.role !== "USER") {
      throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED")!);
    }

    /**
     * Token Rotation
     * Generate a new short-lived Access Token and update the client's cookie.
     */
    const data = authService.createTokens(temp_user);

    res.cookie(
      CookieService.ACCESS_TOKEN.name,
      data.accessToken,
      CookieService.ACCESS_TOKEN.cookie
    );

    req.auth_user = {
      id: decoded.id,
      email: temp_user.email,
      role: temp_user.role,
      is_verified: temp_user.is_verified,
      username: temp_user.username,
    };
    console.log("Token refreshed", req.auth_user);
    return next();
  } catch (error) {
    throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED")!);
  }
};
