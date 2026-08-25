import { authConfig } from "@/config";
import { postgres } from "@/libs";
import { userRedisService } from "@/redis-a/user.redis";
import {
  ACCESS_TOKEN_EXPIRY_SEC,
  CookieService,
} from "@/services/cookie.server";
import { usersTable, type PgUserSelectType } from "@repo/database";
import {
  ApiError,
  ApiResponse,
  getSystemCustomErrorMsgByKey,
} from "@repo/shared";
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
    const incomingRefreshToken =
      req.cookies?.[CookieService.REFRESH_TOKEN.name];
    const incomingAccessToken = req.cookies?.[CookieService.ACCESS_TOKEN.name];

    // console.log("cookies are: ", incomingAccessToken, incomingRefreshToken);

    /**
     * Strategy 1: Fast-Path (Access Token)
     * If a valid Access Token exists, we trust the signed payload to avoid DB/Redis latency.
     */
    if (incomingAccessToken) {
      try {
        const decode_access_token = (await jwt.verify(
          incomingAccessToken,
          AuthConfig.JWT_ACCESS_TOKEN
        )) as { id: string; email: string; role: string };

        // Strict Requirement: Only ADMINs can pass this guard
        if (decode_access_token.role == "ADMIN") {
          req.user = {
            id: decode_access_token.id,
            email: decode_access_token.email,
            role: decode_access_token.role,
          };
          // console.log("Token not refreshed", req.user);
          return next();
        }
      } catch {
        // Access token expired or tampered; fall through to Refresh Token logic
      }
    }

    /**
     * Strategy 2: Silent Refresh (Refresh Token)
     * If we reach here, the Access Token is missing or invalid.
     */
    if (!incomingRefreshToken) {
      throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED")!);
    }

    let decoded: { id: string };
    try {
      decoded = jwt.verify(
        incomingRefreshToken,
        AuthConfig.JWT_REFRESH_TOKEN
      ) as { id: string };
    } catch (err) {
      throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED")!);
    }

    /**
     * User Validation Layer
     * To ensure the user hasn't been banned or had their role changed,
     * we verify identity against our storage layers.
     */
    type TempUserType = Pick<PgUserSelectType, "id" | "email" | "role">;
    let temp_user: TempUserType;

    // Layer A: Redis Lookup (Sub-millisecond latency)
    const cache_data = (await userRedisService.getHashUserLoginInfo(
      decoded.id
    )) as TempUserType;
    // Here redis should be implemented. fetch data from redis

    // Layer B: Database Lookup (Prepared Statement for SQL optimization)
    const prepareExistingUserQuery = await postgres

      .select({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.id, sql.placeholder("id")),
          eq(usersTable.role, "ADMIN")
        )
      )
      .prepare("prepareExistingUserQuery");

    if (!cache_data) {
      const [result] = await prepareExistingUserQuery.execute({
        id: decoded.id,
      });
      temp_user = result as TempUserType;
    } else {
      temp_user = {
        id: cache_data.id,
        email: cache_data.email,
        role: cache_data.role,
      };
    }

    // Final sanity check: Does the user exist and are they an Admin?
    if (!temp_user || temp_user.role !== "ADMIN") {
      throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED")!);
    }

    /**
     * Token Rotation
     * Generate a new short-lived Access Token and update the client's cookie.
     */
    const accessToken = jwt.sign(
      { id: temp_user.id, email: temp_user.email, role: temp_user.role },
      AuthConfig.JWT_ACCESS_TOKEN,
      { expiresIn: ACCESS_TOKEN_EXPIRY_SEC }
    );

    res.cookie(
      CookieService.ACCESS_TOKEN.name,
      accessToken,
      CookieService.ACCESS_TOKEN.cookie
    );

    req.user = {
      id: decoded.id,
      email: temp_user.email as string,
      role: temp_user.role as string,
    };
    console.log("Token refreshed", req.user);
    return next();
  } catch (error) {
    throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED")!);
  }
};
