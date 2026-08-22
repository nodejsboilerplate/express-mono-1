// 5 minutes from now.
export function getVerifyExpiry(): Date {
  return new Date(Date.now() + 5 * 60 * 1000);
}