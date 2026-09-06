import { describe, it, expect } from "vitest";
import {
  ACCESS_TOKEN_EXPIRY_MIN,
  ACCESS_TOKEN_EXPIRY_SEC,
  CookieService,
  REFRESH_TOKEN_EXPIRY_DAY,
  REFRESH_TOKEN_EXPIRY_SEC,
} from "@/services";

describe("cookie.service constants", () => {
  it("computes ACCESS_TOKEN_EXPIRY_SEC from ACCESS_TOKEN_EXPIRY_MIN", () => {
    expect(ACCESS_TOKEN_EXPIRY_MIN).toBe(5);
    expect(ACCESS_TOKEN_EXPIRY_SEC).toBe(5 * 60);
    expect(ACCESS_TOKEN_EXPIRY_SEC).toBe(300);
  });

  it("computes REFRESH_TOKEN_EXPIRY_SEC from REFRESH_TOKEN_EXPIRY_DAY", () => {
    expect(REFRESH_TOKEN_EXPIRY_DAY).toBe(30);
    expect(REFRESH_TOKEN_EXPIRY_SEC).toBe(30 * 24 * 60 * 60);
    expect(REFRESH_TOKEN_EXPIRY_SEC).toBe(2_592_000);
  });
});

describe("CookieService.ACCESS_TOKEN", () => {
  it("uses the name 'accessToken'", () => {
    expect(CookieService.ACCESS_TOKEN.name).toBe("accessToken");
  });

  it("sets the expected cookie security attributes", () => {
    expect(CookieService.ACCESS_TOKEN.cookie).toMatchObject({
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
  });

  it("sets maxAge to ACCESS_TOKEN_EXPIRY_SEC in milliseconds", () => {
    expect(CookieService.ACCESS_TOKEN.cookie.maxAge).toBe(
      ACCESS_TOKEN_EXPIRY_SEC * 1000
    );
    expect(CookieService.ACCESS_TOKEN.cookie.maxAge).toBe(300_000);
  });
});

describe("CookieService.REFRESH_TOKEN", () => {
  it("uses the name 'refreshToken'", () => {
    expect(CookieService.REFRESH_TOKEN.name).toBe("refreshToken");
  });

  it("sets the expected cookie security attributes", () => {
    expect(CookieService.REFRESH_TOKEN.cookie).toMatchObject({
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
  });

  it("sets maxAge to REFRESH_TOKEN_EXPIRY_SEC in milliseconds", () => {
    expect(CookieService.REFRESH_TOKEN.cookie.maxAge).toBe(
      REFRESH_TOKEN_EXPIRY_SEC * 1000
    );
    expect(CookieService.REFRESH_TOKEN.cookie.maxAge).toBe(2_592_000_000);
  });
});

describe("ACCESS_TOKEN vs REFRESH_TOKEN", () => {
  it("uses distinct cookie names", () => {
    expect(CookieService.ACCESS_TOKEN.name).not.toBe(
      CookieService.REFRESH_TOKEN.name
    );
  });

  it("gives the refresh token a longer maxAge than the access token", () => {
    expect(CookieService.REFRESH_TOKEN.cookie.maxAge).toBeGreaterThan(
      CookieService.ACCESS_TOKEN.cookie.maxAge
    );
  });
});
