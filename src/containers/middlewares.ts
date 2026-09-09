import type { createContainer } from "@/container";
import { createAuthMiddleware } from "@/middlewares";
import type { createRepositories } from "./repositories";
import type { createValidators } from "./validators";
import type { createRedisServices } from "./redis-services";
import type { createServices } from "./services";

export const createMiddlewares = ({
  repositories,
  services,
  validators,
  redisServices,
}: {
  repositories: ReturnType<typeof createRepositories>;
  services: ReturnType<typeof createServices>;
  validators: ReturnType<typeof createValidators>;
  redisServices: ReturnType<typeof createRedisServices>;
}) => {
  const containers = {
    repositories,
    validators,
    redisServices,
    services,
  };

  const authMiddleware = createAuthMiddleware(containers);

  return {
    authMiddleware,
  };
};
