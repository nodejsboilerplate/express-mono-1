import request from "supertest";
import { describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";

import {
  usersTable,
  userProfilesTable,
  userContactsTable,
  userPhonesTable,
  userEmailsTable,
  userAddressesTable,
} from "@/database";
import { pgDb } from "@/libs/db.connect";
import { app } from "@/server";

const BASE = "/api/v1/user";
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

function validAddressPayload(overrides: Partial<any> = {}) {
  return {
    addr_name: "Home",
    addr_line_1: "House 12, Road 5",
    addr_line_2: "Block C",
    city: "Dhaka",
    state: "Dhaka Division",
    post_code: "1216",
    country: "Bangladesh",
    country_iso: "BD",
    is_default: true,
    ...overrides,
  };
}

function validPhonePayload(overrides: Partial<any> = {}) {
  return {
    phone_code: "+880",
    phone: "1712345678",
    is_primary: true,
    ...overrides,
  };
}

function validEmailPayload(overrides: Partial<any> = {}) {
  return {
    email: `contact-${crypto.randomUUID()}@example.com`,
    is_primary: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------
// Cookie extraction - signupUserHandler sets access+refresh cookies
// directly on the response, so we capture and replay them.
// ---------------------------------------------------------------

function extractCookies(res: request.Response): string[] {
  const raw = res.headers["set-cookie"];
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((c: string) => c.split(";")[0]!);
}

// ---------------------------------------------------------------
// Fixture helpers
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

async function createTestContact(cookies: string[], overrides: Partial<any> = {}) {
  const res = await request(app)
    .post(`${BASE}/contact`)
    .set("Cookie", cookies)
    .send({ socials: [], ...overrides });

  if (res.status !== 201) {
    console.log(
      "createTestContact failed:",
      res.status,
      JSON.stringify(res.body, null, 2)
    );
  }

  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

async function sendAndGetPhoneCode(cookies: string[], phoneId: string) {
  await request(app)
    .post(`${BASE}/phone/${phoneId}/send-verification-code`)
    .set("Cookie", cookies);
  const [row] = await pgDb
    .select({ verify_code: userPhonesTable.verify_code })
    .from(userPhonesTable)
    .where(eq(userPhonesTable.id, phoneId));
  return row!.verify_code as string;
}

async function sendAndGetEmailCode(cookies: string[], emailId: string) {
  await request(app)
    .post(`${BASE}/email/${emailId}/send-verification-code`)
    .set("Cookie", cookies);
  const [row] = await pgDb
    .select({ verify_code: userEmailsTable.verify_code })
    .from(userEmailsTable)
    .where(eq(userEmailsTable.id, emailId));
  return row!.verify_code as string;
}

// ---------------------------------------------------------------
// Create
// ---------------------------------------------------------------
describe("User API Test", { tags: ["apis/user"] }, () => {
  describe(`POST ${BASE}/address`, () => {
    test("creates an address and persists it", async () => {
      const { userId, cookies } = await signupTestUser();

      const res = await request(app)
        .post(`${BASE}/address`)
        .set("Cookie", cookies)
        .send(validAddressPayload());

      expect(res.status).toBe(201);

      const [row] = await pgDb
        .select()
        .from(userAddressesTable)
        .where(eq(userAddressesTable.id, res.body.data.id));
      expect(row?.user_id).toBe(userId);
      expect(row?.city).toBe("Dhaka");
    });

    test("returns 401 without an access token", async () => {
      const res = await request(app).post(`${BASE}/address`).send(validAddressPayload());
      expect(res.status).toBe(401);
    });

    test("returns 400 when required fields are missing", async () => {
      const { cookies } = await signupTestUser();
      const res = await request(app)
        .post(`${BASE}/address`)
        .set("Cookie", cookies)
        .send({});
      expect(res.status).toBe(400);
    });

    test("returns 400 for a country_iso longer than 2 characters", async () => {
      const { cookies } = await signupTestUser();
      const res = await request(app)
        .post(`${BASE}/address`)
        .set("Cookie", cookies)
        .send(validAddressPayload({ country_iso: "BGD" }));
      expect(res.status).toBe(400);
    });
  });

  describe(`POST ${BASE}/contact`, () => {
    test("creates a contact with no client-supplied id", async () => {
      const { userId, cookies } = await signupTestUser();

      const res = await request(app)
        .post(`${BASE}/contact`)
        .set("Cookie", cookies)
        .send({ socials: [] });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeTypeOf("string");

      const [row] = await pgDb
        .select()
        .from(userContactsTable)
        .where(eq(userContactsTable.id, res.body.data.id));
      expect(row?.user_id).toBe(userId);
    });

    test("creates a contact with socials omitted (defaults to empty array)", async () => {
      const { cookies } = await signupTestUser();
      const res = await request(app)
        .post(`${BASE}/contact`)
        .set("Cookie", cookies)
        .send({});
      expect(res.status).toBe(201);
    });

    test("returns 400 for an invalid social link url", async () => {
      const { cookies } = await signupTestUser();
      const res = await request(app)
        .post(`${BASE}/contact`)
        .set("Cookie", cookies)
        .send({ socials: [{ type: "invalid-platform", url: "not-a-url" }] });
      expect(res.status).toBe(400);
    });

    test("returns 401 without an access token", async () => {
      const res = await request(app).post(`${BASE}/contact`).send({ socials: [] });
      expect(res.status).toBe(401);
    });
  });

  describe(`POST ${BASE}/contact/:id/phone`, () => {
    test("creates a phone tied to a contact", async () => {
      const { userId, cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);

      const res = await request(app)
        .post(`${BASE}/contact/${contactId}/phone`)
        .set("Cookie", cookies)
        .send(validPhonePayload());

      expect(res.status).toBe(201);

      const [row] = await pgDb
        .select()
        .from(userPhonesTable)
        .where(eq(userPhonesTable.id, res.body.data.id));
      expect(row?.contact_id).toBe(contactId);
      expect(row?.user_id).toBe(userId);
      expect(row?.is_verified).toBe(false);
    });

    test("returns 400 for an invalid phone_code", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const res = await request(app)
        .post(`${BASE}/contact/${contactId}/phone`)
        .set("Cookie", cookies)
        .send(validPhonePayload({ phone_code: "" }));
      expect(res.status).toBe(400);
    });
  });

  describe(`POST ${BASE}/contact/:id/email`, () => {
    test("creates an email tied to a contact", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);

      const res = await request(app)
        .post(`${BASE}/contact/${contactId}/email`)
        .set("Cookie", cookies)
        .send(validEmailPayload());

      expect(res.status).toBe(201);
    });

    test("returns 400 for an invalid email", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const res = await request(app)
        .post(`${BASE}/contact/${contactId}/email`)
        .set("Cookie", cookies)
        .send({ email: "not-an-email" });
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------

  describe(`GET ${BASE}/profile`, () => {
    test("returns the authenticated user's profile", async () => {
      const { cookies, email, username } = await signupTestUser();

      const res = await request(app).get(`${BASE}/profile`).set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(email);
      expect(res.body.data.username).toBe(username);
      expect(res.body.data).not.toHaveProperty("password");
    });

    test("returns 401 without an access token", async () => {
      const res = await request(app).get(`${BASE}/profile`);
      expect(res.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------
  // Send Verification Code
  // ---------------------------------------------------------------

  describe(`POST ${BASE}/phone/:id/send-verification-code`, () => {
    test("sends a verification code for the phone", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const phoneRes = await request(app)
        .post(`${BASE}/contact/${contactId}/phone`)
        .set("Cookie", cookies)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const res = await request(app)
        .post(`${BASE}/phone/${phoneId}/send-verification-code`)
        .set("Cookie", cookies);
      expect(res.status).toBe(200);

      const [row] = await pgDb
        .select()
        .from(userPhonesTable)
        .where(eq(userPhonesTable.id, phoneId));
      expect(row?.verify_code).toBeTruthy();
      expect(row?.verify_expiry).toBeTruthy();
      expect(row?.is_verified).toBe(false);
    });

    test("returns 404 for a nonexistent phone", async () => {
      const { cookies } = await signupTestUser();
      const res = await request(app)
        .post(`${BASE}/phone/${crypto.randomUUID()}/send-verification-code`)
        .set("Cookie", cookies);
      expect(res.status).toBe(404);
    });

    test("returns 404 when the phone belongs to a different user", async () => {
      const { cookies } = await signupTestUser();
      const { cookies: otherCookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const phoneRes = await request(app)
        .post(`${BASE}/contact/${contactId}/phone`)
        .set("Cookie", cookies)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const res = await request(app)
        .post(`${BASE}/phone/${phoneId}/send-verification-code`)
        .set("Cookie", otherCookies);
      expect(res.status).toBe(404);
    });
  });

  describe(`POST ${BASE}/email/:id/send-verification-code`, () => {
    test("sends a verification code for the email", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const emailRes = await request(app)
        .post(`${BASE}/contact/${contactId}/email`)
        .set("Cookie", cookies)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      const res = await request(app)
        .post(`${BASE}/email/${emailId}/send-verification-code`)
        .set("Cookie", cookies);
      expect(res.status).toBe(200);

      const [row] = await pgDb
        .select()
        .from(userEmailsTable)
        .where(eq(userEmailsTable.id, emailId));
      expect(row?.verify_code).toBeTruthy();
      expect(row?.verify_expiry).toBeTruthy();
      expect(row?.is_verified).toBe(false);
    });

    test("returns 404 for a nonexistent email", async () => {
      const { cookies } = await signupTestUser();
      const res = await request(app)
        .post(`${BASE}/email/${crypto.randomUUID()}/send-verification-code`)
        .set("Cookie", cookies);
      expect(res.status).toBe(404);
    });

    test("returns 404 when the email belongs to a different user", async () => {
      const { cookies } = await signupTestUser();
      const { cookies: otherCookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const emailRes = await request(app)
        .post(`${BASE}/contact/${contactId}/email`)
        .set("Cookie", cookies)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      const res = await request(app)
        .post(`${BASE}/email/${emailId}/send-verification-code`)
        .set("Cookie", otherCookies);
      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------
  // Verify
  // ---------------------------------------------------------------

  describe(`POST ${BASE}/phone/:id/verify`, () => {
    test("verifies a phone with the correct code", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const phoneRes = await request(app)
        .post(`${BASE}/contact/${contactId}/phone`)
        .set("Cookie", cookies)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const code = await sendAndGetPhoneCode(cookies, phoneId);

      const res = await request(app)
        .post(`${BASE}/phone/${phoneId}/verify`)
        .set("Cookie", cookies)
        .send({ verify_code: code });
      expect(res.status).toBe(200);

      const [row] = await pgDb
        .select()
        .from(userPhonesTable)
        .where(eq(userPhonesTable.id, phoneId));
      expect(row?.is_verified).toBe(true);
    });

    test("returns 400 for the wrong code", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const phoneRes = await request(app)
        .post(`${BASE}/contact/${contactId}/phone`)
        .set("Cookie", cookies)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      await sendAndGetPhoneCode(cookies, phoneId);

      const res = await request(app)
        .post(`${BASE}/phone/${phoneId}/verify`)
        .set("Cookie", cookies)
        .send({ verify_code: "000000" });
      expect(res.status).toBe(400);
    });

    test("returns 400 for an expired code", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const phoneRes = await request(app)
        .post(`${BASE}/contact/${contactId}/phone`)
        .set("Cookie", cookies)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const code = await sendAndGetPhoneCode(cookies, phoneId);
      await pgDb
        .update(userPhonesTable)
        .set({ verify_expiry: new Date(Date.now() - 60 * 1000) })
        .where(eq(userPhonesTable.id, phoneId));

      const res = await request(app)
        .post(`${BASE}/phone/${phoneId}/verify`)
        .set("Cookie", cookies)
        .send({ verify_code: code });
      expect(res.status).toBe(400);
    });

    test("returns 404 for a nonexistent phone", async () => {
      const { cookies } = await signupTestUser();
      const res = await request(app)
        .post(`${BASE}/phone/${crypto.randomUUID()}/verify`)
        .set("Cookie", cookies)
        .send({ verify_code: "123456" });
      expect(res.status).toBe(404);
    });

    test("returns 400 for a malformed code", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const phoneRes = await request(app)
        .post(`${BASE}/contact/${contactId}/phone`)
        .set("Cookie", cookies)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      await sendAndGetPhoneCode(cookies, phoneId);

      const res = await request(app)
        .post(`${BASE}/phone/${phoneId}/verify`)
        .set("Cookie", cookies)
        .send({ verify_code: "12" });
      expect(res.status).toBe(400);
    });

    test("returns 409 for an already-verified phone", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const phoneRes = await request(app)
        .post(`${BASE}/contact/${contactId}/phone`)
        .set("Cookie", cookies)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const code = await sendAndGetPhoneCode(cookies, phoneId);
      await request(app)
        .post(`${BASE}/phone/${phoneId}/verify`)
        .set("Cookie", cookies)
        .send({ verify_code: code });

      const res = await request(app)
        .post(`${BASE}/phone/${phoneId}/verify`)
        .set("Cookie", cookies)
        .send({ verify_code: code });
      expect(res.status).toBe(409);
    });
  });

  describe(`POST ${BASE}/email/:id/verify`, () => {
    test("verifies an email with the correct code", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const emailRes = await request(app)
        .post(`${BASE}/contact/${contactId}/email`)
        .set("Cookie", cookies)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      const code = await sendAndGetEmailCode(cookies, emailId);

      const res = await request(app)
        .post(`${BASE}/email/${emailId}/verify`)
        .set("Cookie", cookies)
        .send({ verify_code: code });
      expect(res.status).toBe(200);

      const [row] = await pgDb
        .select()
        .from(userEmailsTable)
        .where(eq(userEmailsTable.id, emailId));
      expect(row?.is_verified).toBe(true);
    });

    test("returns 400 for the wrong code", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const emailRes = await request(app)
        .post(`${BASE}/contact/${contactId}/email`)
        .set("Cookie", cookies)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      await sendAndGetEmailCode(cookies, emailId);

      const res = await request(app)
        .post(`${BASE}/email/${emailId}/verify`)
        .set("Cookie", cookies)
        .send({ verify_code: "000000" });
      expect(res.status).toBe(400);
    });

    test("returns 400 for an expired code", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const emailRes = await request(app)
        .post(`${BASE}/contact/${contactId}/email`)
        .set("Cookie", cookies)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      const code = await sendAndGetEmailCode(cookies, emailId);
      await pgDb
        .update(userEmailsTable)
        .set({ verify_expiry: new Date(Date.now() - 60 * 1000) })
        .where(eq(userEmailsTable.id, emailId));

      const res = await request(app)
        .post(`${BASE}/email/${emailId}/verify`)
        .set("Cookie", cookies)
        .send({ verify_code: code });
      expect(res.status).toBe(400);
    });

    test("returns 404 for a nonexistent email", async () => {
      const { cookies } = await signupTestUser();
      const res = await request(app)
        .post(`${BASE}/email/${crypto.randomUUID()}/verify`)
        .set("Cookie", cookies)
        .send({ verify_code: "123456" });
      expect(res.status).toBe(404);
    });

    test("returns 409 for an already-verified email", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const emailRes = await request(app)
        .post(`${BASE}/contact/${contactId}/email`)
        .set("Cookie", cookies)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      const code = await sendAndGetEmailCode(cookies, emailId);
      await request(app)
        .post(`${BASE}/email/${emailId}/verify`)
        .set("Cookie", cookies)
        .send({ verify_code: code });

      const res = await request(app)
        .post(`${BASE}/email/${emailId}/verify`)
        .set("Cookie", cookies)
        .send({ verify_code: code });
      expect(res.status).toBe(409);
    });
  });

  // ---------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------

  describe(`PATCH ${BASE}/profile`, () => {
    test("updates the profile", async () => {
      const { userId, cookies } = await signupTestUser();
      const [existing] = await pgDb
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.user_id, userId));

      const res = await request(app)
        .patch(`${BASE}/profile`)
        .set("Cookie", cookies)
        .send({ id: existing!.id, first_name: "Updated" });
      expect(res.status).toBe(200);

      const [row] = await pgDb
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.user_id, userId));
      expect(row?.first_name).toBe("Updated");
    });

    test("returns 400 when id is missing from the body", async () => {
      const { cookies } = await signupTestUser();
      const res = await request(app)
        .patch(`${BASE}/profile`)
        .set("Cookie", cookies)
        .send({ first_name: "Nobody" });
      expect(res.status).toBe(400);
    });

    test("returns 404 for a nonexistent profile id", async () => {
      const { cookies } = await signupTestUser();
      const res = await request(app)
        .patch(`${BASE}/profile`)
        .set("Cookie", cookies)
        .send({ id: crypto.randomUUID(), first_name: "Nobody" });
      expect(res.status).toBe(404);
    });

    test("returns 401 without an access token", async () => {
      const res = await request(app)
        .patch(`${BASE}/profile`)
        .send({ id: crypto.randomUUID(), first_name: "Nobody" });
      expect(res.status).toBe(401);
    });
  });

  describe(`PATCH ${BASE}/address/:id`, () => {
    test("updates the address", async () => {
      const { cookies } = await signupTestUser();
      const createRes = await request(app)
        .post(`${BASE}/address`)
        .set("Cookie", cookies)
        .send(validAddressPayload());
      const addressId = createRes.body.data.id as string;

      const res = await request(app)
        .patch(`${BASE}/address/${addressId}`)
        .set("Cookie", cookies)
        .send({ city: "Chattogram" });
      expect(res.status).toBe(200);

      const [row] = await pgDb
        .select()
        .from(userAddressesTable)
        .where(eq(userAddressesTable.id, addressId));
      expect(row?.city).toBe("Chattogram");
    });

    test("returns 404 for a nonexistent address", async () => {
      const { cookies } = await signupTestUser();
      const res = await request(app)
        .patch(`${BASE}/address/${crypto.randomUUID()}`)
        .set("Cookie", cookies)
        .send({ city: "Nowhere" });
      expect(res.status).toBe(404);
    });
  });

  describe(`PATCH ${BASE}/contact`, () => {
    test("updates the contact", async () => {
      const { userId, cookies } = await signupTestUser();
      await createTestContact(cookies);

      const res = await request(app)
        .patch(`${BASE}/contact`)
        .set("Cookie", cookies)
        .send({
          socials: [{ type: "facebook", url: "https://facebook.com/mahin" }],
        });
      expect(res.status).toBe(200);

      const [row] = await pgDb
        .select()
        .from(userContactsTable)
        .where(eq(userContactsTable.user_id, userId));
      expect(row?.socials).toEqual([
        { type: "facebook", url: "https://facebook.com/mahin" },
      ]);
    });

    test("returns 404 when no contact row exists", async () => {
      const { cookies } = await signupTestUser();
      const res = await request(app)
        .patch(`${BASE}/contact`)
        .set("Cookie", cookies)
        .send({ socials: [] });
      expect(res.status).toBe(404);
    });
  });

  describe(`PATCH ${BASE}/phone/:id`, () => {
    test("updates the phone", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const phoneRes = await request(app)
        .post(`${BASE}/contact/${contactId}/phone`)
        .set("Cookie", cookies)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const res = await request(app)
        .patch(`${BASE}/phone/${phoneId}`)
        .set("Cookie", cookies)
        .send({ phone: "1999999999" });
      expect(res.status).toBe(200);

      const [row] = await pgDb
        .select()
        .from(userPhonesTable)
        .where(eq(userPhonesTable.id, phoneId));
      expect(row?.phone).toBe("1999999999");
    });

    test("returns 404 for a nonexistent phone", async () => {
      const { cookies } = await signupTestUser();
      const res = await request(app)
        .patch(`${BASE}/phone/${crypto.randomUUID()}`)
        .set("Cookie", cookies)
        .send({ phone: "1999999999" });
      expect(res.status).toBe(404);
    });
  });

  describe(`PATCH ${BASE}/email/:id`, () => {
    test("updates the email", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const emailRes = await request(app)
        .post(`${BASE}/contact/${contactId}/email`)
        .set("Cookie", cookies)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      const newEmail = `updated-${crypto.randomUUID()}@example.com`;
      const res = await request(app)
        .patch(`${BASE}/email/${emailId}`)
        .set("Cookie", cookies)
        .send({ email: newEmail });
      expect(res.status).toBe(200);

      const [row] = await pgDb
        .select()
        .from(userEmailsTable)
        .where(eq(userEmailsTable.id, emailId));
      expect(row?.email).toBe(newEmail);
    });
  });

  // ---------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------

  describe(`DELETE ${BASE}`, () => {
    test("deletes the authenticated user", async () => {
      const { userId, cookies } = await signupTestUser();
      const res = await request(app).delete(`${BASE}`).set("Cookie", cookies);
      expect(res.status).toBe(200);

      const rows = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));
      expect(rows).toHaveLength(0);
    });

    test("returns 401 without an access token", async () => {
      const res = await request(app).delete(`${BASE}`);
      expect(res.status).toBe(401);
    });
  });

  describe(`DELETE ${BASE}/address/:id`, () => {
    test("deletes the address", async () => {
      const { cookies } = await signupTestUser();
      const createRes = await request(app)
        .post(`${BASE}/address`)
        .set("Cookie", cookies)
        .send(validAddressPayload());
      const addressId = createRes.body.data.id as string;

      const res = await request(app)
        .delete(`${BASE}/address/${addressId}`)
        .set("Cookie", cookies);
      expect(res.status).toBe(200);
    });

    test("returns 404 for a nonexistent address", async () => {
      const { cookies } = await signupTestUser();
      const res = await request(app)
        .delete(`${BASE}/address/${crypto.randomUUID()}`)
        .set("Cookie", cookies);
      expect(res.status).toBe(404);
    });
  });

  describe(`DELETE ${BASE}/contact/:id`, () => {
    test("deletes the contact", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);

      const res = await request(app)
        .delete(`${BASE}/contact/${contactId}`)
        .set("Cookie", cookies);
      expect(res.status).toBe(200);
    });

    test("returns 404 for a nonexistent contact", async () => {
      const { cookies } = await signupTestUser();
      const res = await request(app)
        .delete(`${BASE}/contact/${crypto.randomUUID()}`)
        .set("Cookie", cookies);
      expect(res.status).toBe(404);
    });
  });

  describe(`DELETE ${BASE}/phone/:id`, () => {
    test("deletes the phone", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const phoneRes = await request(app)
        .post(`${BASE}/contact/${contactId}/phone`)
        .set("Cookie", cookies)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const res = await request(app)
        .delete(`${BASE}/phone/${phoneId}`)
        .set("Cookie", cookies);
      expect(res.status).toBe(200);
    });
  });

  describe(`DELETE ${BASE}/email/:id`, () => {
    test("deletes the email", async () => {
      const { cookies } = await signupTestUser();
      const contactId = await createTestContact(cookies);
      const emailRes = await request(app)
        .post(`${BASE}/contact/${contactId}/email`)
        .set("Cookie", cookies)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      const res = await request(app)
        .delete(`${BASE}/email/${emailId}`)
        .set("Cookie", cookies);
      expect(res.status).toBe(200);
    });
  });
});