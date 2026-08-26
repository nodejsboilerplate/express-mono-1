export type AccessTokenPayload = Pick<
  UserSelectType,
  "email" | "id" | "is_verified" | "role" | "username"
>;
export type RefreshTokenPayload = Pick<UserSelectType, "id">;
