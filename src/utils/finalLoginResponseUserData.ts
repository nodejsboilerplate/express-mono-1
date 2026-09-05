import type { AccessTokenPayload, UserProfileDataByLoginType } from "@/types";

export const finalLoginResponseUserData = (
  user: AccessTokenPayload,
  profile: UserProfileDataByLoginType
) => {
  const tokenData: AccessTokenPayload = {
    email: user.email,
    id: user.id,
    is_verified: user.is_verified,
    role: user.role,
    username: user.username,
  };

  const profileData: UserProfileDataByLoginType = {
    avatar: profile?.avatar,
    first_name: profile?.first_name,
    last_name: profile?.last_name,
    nickname: profile?.nickname,
  };

  return {
    tokenData,
    profileData,
  };
};
