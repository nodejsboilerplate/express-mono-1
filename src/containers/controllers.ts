import { AuthController } from "@/controllers/auth.controller";
import type { createServices } from "./services";
import { UserController } from "@/controllers/user.controller";
import { ResendController } from "@/controllers/resend.controller";
import { MessageController } from "@/controllers/message.contoller";

export const createControllers = (
  services: ReturnType<typeof createServices>
) => {
  const {
    authService,
    emailService,
    tokenService,
    phoneService,
    userService,
    resendService,
    verificationService,
  } = services;

  const authController = new AuthController({
    authService,
    emailService,
    tokenService,
    verificationService,
  });

  const userController = new UserController({
    userService,
  });

  const resendController = new ResendController({
    resendService,
  });

  const messegeController = new MessageController({
    emailService,
    phoneService,
    verificationService,
  });

  return {
    authController,
    userController,
    resendController,
    messegeController,
  };
};
