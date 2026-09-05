import request from "supertest";
import { describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";

import { usersTable } from "@/database";
import { pgDb } from "@/libs/db.connect";
import { app } from "@/server";

const AUTH_BASE = "/api/v1/auth";

// ---------------------------------------------------------------
// Payload builders
// ---------------------------------------------------------------

function validSignupPayload(
  overrides: { user?: Partial<any>; profile?: Partial<any> } = {}
) {
  return {
    user: {
      email: `test-${crypto.randomUUID()}@example.com`,
      username: `user_${crypto.randomUUID().slice(0, 8)}`,
      password: "SuperSecret123!",
      role: "USER",
      ...overrides.user,
    },
    profile: {
      first_name: "Mahin",
      last_name: "N",
      ...overrides.profile,
    },
  };
}

// ---------------------------------------------------------------
// Cookie extraction
// ---------------------------------------------------------------

function extractCookies(res: request.Response): string[] {
  const raw = res.headers["set-cookie"];
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((c: string) => c.split(";")[0]!);
}

// ---------------------------------------------------------------
// Fixture helper
// ---------------------------------------------------------------

async function signupTestUser(
  overrides: { user?: Partial<any>; profile?: Partial<any> } = {}
) {
  const payload = validSignupPayload(overrides);
  const res = await request(app).post(`${AUTH_BASE}/signup`).send(payload);

  if (res.status !== 201) {
    console.log(
      "signupTestUser failed:",
      res.status,
      JSON.stringify(res.body, null, 2)
    );
  }

  expect(res.status).toBe(201);

  return {
    userId: res.body.data.id as string,
    cookies: extractCookies(res),
    email: payload.user.email,
    username: payload.user.username,
    password: payload.user.password,
  };
}

describe("Auth API Test", { tags: ["apis/auth"] }, () => {
  // ---------------------------------------------------------------
  // Signup
  // ---------------------------------------------------------------

  describe(`POST ${AUTH_BASE}/signup`, () => {
    test("creates a user + profile, sets auth cookies, returns 201", async () => {
      const payload = validSignupPayload();
      const res = await request(app).post(`${AUTH_BASE}/signup`).send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeTypeOf("string");

      const cookies = extractCookies(res);
      expect(cookies.some((c) => c.startsWith("accessToken="))).toBe(true);
      expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);

      const [row] = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, res.body.data.id));
      expect(row?.role).toBe("USER");
      expect(row?.is_verified).toBe(false);
      expect(row?.verify_code).toBeTruthy();
    });

    test("returns 400 for invalid email", async () => {
      const res = await request(app)
        .post(`${AUTH_BASE}/signup`)
        .send(validSignupPayload({ user: { email: "not-an-email" } }));
      expect(res.status).toBe(400);
    });

    test("returns 400 when first_name is missing", async () => {
      const payload = validSignupPayload();
      const { first_name, ...profileWithoutFirstName } = payload.profile;
      const res = await request(app)
        .post(`${AUTH_BASE}/signup`)
        .send({ ...payload, profile: profileWithoutFirstName });
      expect(res.status).toBe(400);
    });

    test("returns 400 for a username with disallowed characters", async () => {
      const res = await request(app)
        .post(`${AUTH_BASE}/signup`)
        .send(validSignupPayload({ user: { username: "bad-username!" } }));
      expect(res.status).toBe(400);
    });

    test("returns 400 for a password under 8 characters", async () => {
      const res = await request(app)
        .post(`${AUTH_BASE}/signup`)
        .send(validSignupPayload({ user: { password: "short" } }));
      expect(res.status).toBe(400);
    });

    test("returns 400 when email is already taken", async () => {
      const payload = validSignupPayload();
      const first = await request(app)
        .post(`${AUTH_BASE}/signup`)
        .send(payload);
      expect(first.status).toBe(201);

      const second = await request(app)
        .post(`${AUTH_BASE}/signup`)
        .send(validSignupPayload({ user: { email: payload.user.email } }));
      expect(second.status).toBe(400);
    });

    test("returns 400 when already authenticated (existing cookies sent)", async () => {
      const { cookies } = await signupTestUser();

      const res = await request(app)
        .post(`${AUTH_BASE}/signup`)
        .set("Cookie", cookies)
        .send(validSignupPayload());
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------

  describe(`POST ${AUTH_BASE}/login`, () => {
    test("logs in with a correct email + password, sets cookies", async () => {
      const { email, password } = await signupTestUser();

      const res = await request(app)
        .post(`${AUTH_BASE}/login`)
        .send({ identifier: email, password });

      expect(res.status).toBe(200);
      const cookies = extractCookies(res);
      expect(cookies.some((c) => c.startsWith("accessToken="))).toBe(true);
      expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);
    });

    test("logs in with a correct username + password", async () => {
      const { username, password } = await signupTestUser();

      const res = await request(app)
        .post(`${AUTH_BASE}/login`)
        .send({ identifier: username, password });
      expect(res.status).toBe(200);
    });

    test("returns 404 when the identifier does not match any user", async () => {
      const res = await request(app)
        .post(`${AUTH_BASE}/login`)
        .send({
          identifier: `nobody-${crypto.randomUUID()}@example.com`,
          password: "whatever123",
        });
      expect(res.status).toBe(404);
    });

    test("returns 401 when the password is incorrect", async () => {
      const { email } = await signupTestUser();

      const res = await request(app)
        .post(`${AUTH_BASE}/login`)
        .send({ identifier: email, password: "WrongPassword1!" });
      expect(res.status).toBe(401);
    });

    test("returns 400 for a malformed payload", async () => {
      const res = await request(app).post(`${AUTH_BASE}/login`).send({});
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------
  // Resend signup code
  // ---------------------------------------------------------------

  describe(`POST ${AUTH_BASE}/resend-signup-code`, () => {
    test("resends a verification code for the authenticated user", async () => {
      const { userId, cookies } = await signupTestUser();

      const res = await request(app)
        .post(`${AUTH_BASE}/resend-signup-code`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);

      const [row] = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));
      expect(row?.verify_code).toBeTruthy();
      expect(row?.verify_expiry).toBeTruthy();
    });

    test("returns 401 without an access token", async () => {
      const res = await request(app).post(`${AUTH_BASE}/resend-signup-code`);
      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------
  // Verify signup code
  // ---------------------------------------------------------------

  describe(`POST ${AUTH_BASE}/verify-signup-code`, () => {
    test("verifies the authenticated user with a correct, unexpired code", async () => {
      const { userId, cookies } = await signupTestUser();

      const [row] = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      const res = await request(app)
        .post(`${AUTH_BASE}/verify-signup-code`)
        .set("Cookie", cookies)
        .send({ verify_code: row!.verify_code });

      expect(res.status).toBe(200);

      const [updated] = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));
      expect(updated?.is_verified).toBe(true);
      expect(updated?.verify_code).toBeNull();
      expect(updated?.verify_expiry).toBeNull();
    });

    test("returns 400 for the wrong code", async () => {
      const { cookies } = await signupTestUser();

      const res = await request(app)
        .post(`${AUTH_BASE}/verify-signup-code`)
        .set("Cookie", cookies)
        .send({ verify_code: "000000" });
      expect(res.status).toBe(400);
    });

    test("returns 400 for an expired code", async () => {
      const { userId, cookies } = await signupTestUser();

      const [row] = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      await pgDb
        .update(usersTable)
        .set({ verify_expiry: new Date(Date.now() - 60_000) })
        .where(eq(usersTable.id, userId));

      const res = await request(app)
        .post(`${AUTH_BASE}/verify-signup-code`)
        .set("Cookie", cookies)
        .send({ verify_code: row!.verify_code });
      expect(res.status).toBe(400);
    });

    test("returns 400 when the user is already verified", async () => {
      const { userId, cookies } = await signupTestUser();

      const [row] = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      await request(app)
        .post(`${AUTH_BASE}/verify-signup-code`)
        .set("Cookie", cookies)
        .send({ verify_code: row!.verify_code });

      const res = await request(app)
        .post(`${AUTH_BASE}/verify-signup-code`)
        .set("Cookie", cookies)
        .send({ verify_code: row!.verify_code });
      expect(res.status).toBe(400);
    });

    test("returns 401 without an access token", async () => {
      const res = await request(app)
        .post(`${AUTH_BASE}/verify-signup-code`)
        .send({ verify_code: "123456" });
      expect(res.status).toBe(401);
    });
  });
});
