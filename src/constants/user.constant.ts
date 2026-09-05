export const USER_ROLES = ["ADMIN", "USER"] as const;

export const USER_ACCOUNT_PROVIDERS = [
  "GOOGLE",
  "GITHUB",
  "DISCORD",
  "MANUAL",
] as const;

export const USER_GENDERS = [
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
] as const;

export enum Socials {
  FACEBOOK = "facebook",
  INSTAGRAM = "instagram",
  TWITTER = "twitter",
  LINKEDIN = "linkedin",
  YOUTUBE = "youtube",
  TIKTOK = "tiktok",
  PINTEREST = "pinterest",
  SNAPCHAT = "snapchat",
  REDDIT = "reddit",
  THREADS = "threads",
  DISCORD = "discord",
  TELEGRAM = "telegram",
  WHATSAPP = "whatsapp",
  GITHUB = "github",
  GITLAB = "gitlab",
  BEHANCE = "behance",
  DRIBBBLE = "dribbble",
  MEDIUM = "medium",
  TUMBLR = "tumblr",
  TWITCH = "twitch",
  SPOTIFY = "spotify",
  WEBSITE = "website",
  PORTFOLIO = "portfolio",
  OTHER = "other",
}
