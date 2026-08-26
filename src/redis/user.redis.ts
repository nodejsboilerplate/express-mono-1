import { redisClient } from "@/libs";
import type { AccessTokenPayload } from "@/types";

interface UserRedisManagerType {
    cacheUserLoginData(payload: AccessTokenPayload): Promise<boolean>,
    getCachedLoginData(key: string): Promise<AccessTokenPayload | null>
    deleteCachedLoginData(key: string): Promise<boolean>
}

export class UserRedisManager implements UserRedisManagerType {
    async cacheUserLoginData(payload: AccessTokenPayload): Promise<boolean> {
       const result =  await redisClient.set(payload.id, JSON.stringify(payload), {condition: "NX"})
       return result === "OK"
    }

    async getCachedLoginData(key: string): Promise<AccessTokenPayload | null> {
        const result = await redisClient.get(key) as AccessTokenPayload | null
        return result
    }
     async deleteCachedLoginData(key: string): Promise<boolean> {
         const result = await redisClient.del(key)
         return result == 1
     }
}