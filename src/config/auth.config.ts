type AuthConfigType = {
  JWT_ACCESS_TOKEN: string;
  JWT_REFRESH_TOKEN: string;
};

export const authConfig: AuthConfigType = {
  JWT_ACCESS_TOKEN: process.env.JWT_ACCESS_TOKEN ?? "",
  JWT_REFRESH_TOKEN: process.env.JWT_REFRESH_TOKEN ?? "",
};
