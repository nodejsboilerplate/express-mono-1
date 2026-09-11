import {
  AuthController,
  MessageController,
  ResendController,
  UserController,
} from "@/controllers";
import type { createServices } from "./services";

export const createControllers = (
  services: ReturnType<typeof createServices>
) => {
  const {
    authService,
    emailService,
    phoneService,
    userService,
    resendService,
    verificationService,
  } = services;

  const authController = new AuthController({
    authService,
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
