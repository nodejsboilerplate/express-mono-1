import {
  EmailService,
  PhoneMessagingService,
  ResendService,
  UserService,
  VerificationService,
} from "@/services";
import { AuthService } from "@/services/auth/auth.service";
import { TokenService } from "@/services/auth/token.service";
import type { createRepositories } from "./repositories";
import type { createValidators } from "./validators";
import type { createRedisServices } from "./redis-services";

export const createServices = ({
  repositories,
  validators,
  redisServices,
}: {
  repositories: ReturnType<typeof createRepositories>;
  validators: ReturnType<typeof createValidators>;
  redisServices: ReturnType<typeof createRedisServices>;
}) => {
  const { userRepository } = repositories;
  const { userInputValidators } = validators;
  const { authRedis } = redisServices;

  const emailService = new EmailService({
    userInputValidators,
    userRepository,
  });
  const phoneService = new PhoneMessagingService({
    userInputValidators,
    userRepository,
  });
  const userService = new UserService({
    userInputValidators,
    userRepository,
  });
  const tokenService = new TokenService();
  const verificationService = new VerificationService({
    userInputValidators,
    userRepository,
    userService,
  });
  const authService = new AuthService({
    authRedis,
    emailService,
    tokenService,
    userInputValidators,
    userRepository,
    userService,
  });

  const resendService = new ResendService();

  return {
    userService,
    emailService,
    phoneService,
    tokenService,
    verificationService,
    authService,
    resendService,
  };
};
