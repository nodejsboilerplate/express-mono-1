import { AuthRedis } from "@/redis";
import { GoogleOAuthService } from "./google-auth.service";
import { ManualAuthService } from "./manual-auth.service";
import { UserService } from "../user.service";
import { UserRepository } from "@/database/repositories";
import { UserInputValidators } from "@/validators/inputs";
import { TokenService } from "./token.service";
import type { IEmailService } from "@/blueprints";
import type { UserBasicInfoDataType } from "@/types";
import { getSystemCustomErrorMsgByKey } from "@/events";
import { ApiError } from "@/libs";

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
  private userRepository: UserRepository;
  private authRedis: AuthRedis;
  private tokenService: TokenService;

  constructor({
    authRedis,
    emailService,
    tokenService,
    userInputValidators,
    userRepository,
    userService,
  }: AuthServiceDepsType) {
    this.userRepository = userRepository;
    this.authRedis = authRedis;
    this.tokenService = tokenService;

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

  async getAuthUserData(id: string) {
    let temp_user: UserBasicInfoDataType;

    const get_cached_data = await this.authRedis.getCachedLoginData(id);
    const parse_data = JSON.parse(
      String(get_cached_data)
    ) as UserBasicInfoDataType;

    if (!parse_data) {
      const existedUser =
        await this.userRepository.GetUserDataForLoginByEmailOrUsernameOrId(id);
      if (!existedUser?.id) {
        throw new ApiError(401, getSystemCustomErrorMsgByKey("UNAUTHORIZED"));
      }

      const { tokenData, profileData } =
        this.tokenService.finalLoginResponseUserData(
          existedUser,
          existedUser.profile!
        );

      await this.authRedis.cacheUserLoginData(existedUser?.id as string, {
        ...tokenData,
        ...profileData,
      });

      temp_user = {
        ...tokenData,
        ...profileData,
      };
    } else {
      temp_user = parse_data;
    }

    return temp_user;
  }
}
