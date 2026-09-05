import { UserRepository } from "@/database/repositories";
import { getSystemCustomErrorMsgByKey } from "@/events";
import { ApiError } from "@/libs";
import { AuthRedis } from "@/redis";
import { AuthService } from "@/services";
import { CookieService } from "@/services/cookie.service";
import type {
  AccessTokenPayload,
  UserBasicInfoDataType,
  UserProfileDataByLoginType,
} from "@/types";
import { finalLoginResponseUserData } from "@/utils";
import type { NextFunction, Response, Request } from "express";

const authService = new AuthService();
const authRedis = new AuthRedis();
const userRepository = new UserRepository();

/**
 * Middleware to enforce authentication and manage token rotation.
 *
 * 1. Get access and refresh token
 * 2. check if access token is valid
 * 3. if invalid access token check is refresh token is valid
 * 4. if refresh token is valid regenerate access token
 * 5. if there is a cache data via user id get data for access token payload
 * 6. if no cache fetch from database and cache in redis
 *
 * @throws {ApiError} 401 Unauthorized if both tokens are invalid or user lacks Admin permissions.
 */
export const authMiddlware = async (
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

        if (decode_data?.id) {
          req.auth_user = decode_data;
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
      console.log("problem here");
      throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED")!);
    }

    let decoded;
    try {
      decoded = authService.getDataFromRefreshToken(refreshToken);
    } catch (err) {
      console.log("problem here");
      throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED")!);
    }

    /**
     * User Validation Layer
     * To ensure the user hasn't been banned or had their role changed,
     * we verify identity against our storage layers.
     */
    let temp_user: AccessTokenPayload;

    // Redis Lookup
    const get_cached_data = await authRedis.getCachedLoginData(decoded.id);
    const parse_data = JSON.parse(
      String(get_cached_data)
    ) as UserBasicInfoDataType;
    console.log("parse data", parse_data);
    if (!parse_data) {
      const user =
        await userRepository.GetUserDataForLoginByEmailOrUsernameOrId(
          decoded.id
        );

      if (!user?.id) {
        console.log("problem here");
        throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED"));
      }

      const profile = user?.profile;

      const { tokenData, profileData } = finalLoginResponseUserData(
        user,
        profile!
      );

      await authRedis.cacheUserLoginData(user?.id as string, {
        ...tokenData,
        ...profileData,
      });

      temp_user = tokenData;
      console.log("here is cache mahin", get_cached_data);
    } else {
      temp_user = {
        id: parse_data.id,
        username: parse_data.username,
        email: parse_data.email,
        role: parse_data.role,
        is_verified: parse_data.is_verified,
      };
    }

    if (!temp_user.id) {
      console.log("problem here definitely");
      throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED")!);
    }

    /**
     * Token Rotation
     * Generate a new short-lived Access Token and update the client's cookie.
     */
    const renewed_access_token = authService.renewAccessToken(temp_user);

    res.cookie(
      CookieService.ACCESS_TOKEN.name,
      renewed_access_token,
      CookieService.ACCESS_TOKEN.cookie
    );

    req.auth_user = {
      id: temp_user.id,
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
