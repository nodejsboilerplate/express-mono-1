import { AuthController } from "@/controllers/auth.controller";
import type { createServices } from "./services";
import { UserController } from "@/controllers/user.controller";
import { ResendController } from "@/controllers/resend.controller";

export const createControllers = (
  services: ReturnType<typeof createServices>
) => {
  const {
    authService,
    emailService,
    tokenService,
    phoneService,
    userService,
    verificationService,
  } = services;

  const authController = new AuthController({
    authService,
    emailService,
    tokenService,
    verificationService,
  });

  const userController = new UserController({
    emailService,
    phoneService,
    userService,
    verificationService,
  });

  const resendController = new ResendController();

  return {
    authController,
    userController,
    resendController,
  };
};
