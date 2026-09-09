import { AuthRedis } from "@/redis";
import { GoogleOAuthService } from "./google-auth.service";
import { ManualAuthService } from "./manual-auth.service";
import { UserService } from "../user.service";
import { UserRepository } from "@/database/repositories";
import { UserInputValidators } from "@/validators/inputs";
import { TokenService } from "./token.service";
import type { IEmailService } from "@/blueprints";

type AuthServiceDepsType = {
  authRedis: AuthRedis;
  emailService: IEmailService;
  tokenService: TokenService;
  userInputValidators: UserInputValidators;
  userRepository: UserRepository;
  userService: UserService;
};

export class AuthService {
  public manualAuth: ManualAuthService;
  public googleOAuth: GoogleOAuthService;

  constructor({
    authRedis,
    emailService,
    tokenService,
    userInputValidators,
    userRepository,
    userService,
  }: AuthServiceDepsType) {
    this.manualAuth = new ManualAuthService({
      authRedis,
      emailService,
      tokenService,
      userInputValidators,
      userRepository,
      userService,
    });
    this.googleOAuth = new GoogleOAuthService({
      authRedis,
      emailService,
      tokenService,
      userService,
    });
  }
}
