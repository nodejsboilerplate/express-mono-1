import { RedisResponse } from "@/constants";
import { redisClient } from "@/libs";
import { ACCESS_TOKEN_EXPIRY_MIN, ACCESS_TOKEN_EXPIRY_SEC } from "@/services";
import type { AccessTokenPayload } from "@/types";

interface UserRedisManagerType {
  cacheUserLoginData(
    key: string,
    payload: AccessTokenPayload
  ): Promise<boolean>;
  getCachedLoginData(key: string): Promise<AccessTokenPayload | null>;
  deleteCachedLoginData(key: string): Promise<boolean>;
  setCacheExpirationUserLoginData(
    key: string,
    seconds: number
  ): Promise<boolean>;
}

export class UserRedisManager implements UserRedisManagerType {
  async cacheUserLoginData(
    key: string,
    payload: AccessTokenPayload
  ): Promise<boolean> {
    const [result, expiry_result] = await redisClient
      .multi()
      .set(key, JSON.stringify(payload), {
        condition: "NX",
      })
      .expire(key, ACCESS_TOKEN_EXPIRY_SEC + 1 * 60)
      .exec();

    return (result as unknown as string) === RedisResponse.OK;
  }

  async getCachedLoginData(key: string): Promise<AccessTokenPayload | null> {
    const result = (await redisClient.get(key)) as AccessTokenPayload | null;
    return result;
  }

  async deleteCachedLoginData(key: string): Promise<boolean> {
    const result = await redisClient.del(key);
    return result === RedisResponse.SUCCESS;
  }

  async setCacheExpirationUserLoginData(
    key: string,
    seconds: number
  ): Promise<boolean> {
    const result = await redisClient.expire(key, seconds);
    return result === RedisResponse.SUCCESS;
  }
}

export const userRedisManager = new UserRedisManager();
