// Random 6 digit numeric verification code, e.g. "042913".
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
