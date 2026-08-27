import type { UserSelectType } from "@/database/type";

export type AccessTokenPayload = Pick<
  UserSelectType,
  "email" | "id" | "is_verified" | "role" | "username"
>;
export type RefreshTokenPayload = Pick<UserSelectType, "id">;


export type CookieNames = {
  accessToken: string;
  refreshToken: string;
};


declare global {
  namespace Express {
    interface Request {
      auth_user: AccessTokenPayload;
    }
  }
}