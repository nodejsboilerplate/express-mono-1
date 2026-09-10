import { AuthRedis } from "@/redis";

export const createRedisServices = () => {
  const authRedis = new AuthRedis();

  return {
    authRedis,
  };
};
