import "dotenv/config";

export type BaseConfigType = {
  PORT: number;
  NODE_ENV: string;
};

export const baseConfig: BaseConfigType = {
  PORT: Number(process.env.PORT),
  NODE_ENV: process.env.NODE_ENV!,
};
