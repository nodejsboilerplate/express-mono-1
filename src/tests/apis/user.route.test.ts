import request from "supertest";
import { describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

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
import { authConfig } from "@/config";
import { CookieService } from "@/services/cookie.service";

const BASE = "/api/v1/user";
const AUTH_BASE = "/api/v1/auth";

// ---------------------------------------------------------------
// Payload builders
// ---------------------------------------------------------------


function validSignupPayload(overrides: {
  user?: Partial<any>;
  profile?: Partial<any>;
} = {}) {
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
// Fixture helpers
// ---------------------------------------------------------------

async function createTestUser(overrides: {
  user?: Partial<any>;
  profile?: Partial<any>;
} = {}) {
  const res = await request(app)
    .post(`${AUTH_BASE}/signup`)
    .send(validSignupPayload(overrides));

  if (res.status !== 201) {
    console.log(
      "createTestUser failed:",
      res.status,
      JSON.stringify(res.body, null, 2)
    );
  }

  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

async function createTestContact(userId: string, overrides: Partial<any> = {}) {
  const res = await request(app)
    .post(`${BASE}/${userId}/contact`)
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

async function sendAndGetPhoneCode(userId: string, phoneId: string) {
  await request(app).post(
    `${BASE}/${userId}/phone/${phoneId}/send-verification-code`
  );
  const [row] = await pgDb
    .select({ verify_code: userPhonesTable.verify_code })
    .from(userPhonesTable)
    .where(eq(userPhonesTable.id, phoneId));
  return row!.verify_code as string;
}

async function sendAndGetEmailCode(userId: string, emailId: string) {
  await request(app).post(
    `${BASE}/${userId}/email/${emailId}/send-verification-code`
  );
  const [row] = await pgDb
    .select({ verify_code: userEmailsTable.verify_code })
    .from(userEmailsTable)
    .where(eq(userEmailsTable.id, emailId));
  return row!.verify_code as string;
}

// `getUserCoreHandler` sits behind `authMiddlware`. The router/auth setup
// wasn't shown, so this assumes it reads the access token from the same
// cookie AuthService/CookieService issue on login — swap for whatever
// header/cookie your middleware actually expects if this doesn't match.
function buildAccessTokenCookie(payload: Partial<any> = {}) {
  const token = jwt.sign(
    { id: crypto.randomUUID(), role: "USER", ...payload },
    authConfig.JWT_ACCESS_TOKEN_SECRET,
    { expiresIn: 900 }
  );
  return `${CookieService.ACCESS_TOKEN.name}=${token}`;
}

// ---------------------------------------------------------------
// Create
// ---------------------------------------------------------------
describe("User API Test", { tags: ["apis/user"] }, () => {
  describe(`POST ${BASE}/:user_id/address`, () => {
    test("creates an address and persists it", async () => {
      const userId = await createTestUser();

      const res = await request(app)
        .post(`${BASE}/${userId}/address`)
        .send(validAddressPayload());

      expect(res.status).toBe(201);

      const [row] = await pgDb
        .select()
        .from(userAddressesTable)
        .where(eq(userAddressesTable.id, res.body.data.id));
      expect(row?.user_id).toBe(userId);
      expect(row?.city).toBe("Dhaka");
    });

    test("returns 400 when required fields are missing", async () => {
      const userId = await createTestUser();
      const res = await request(app).post(`${BASE}/${userId}/address`).send({});
      expect(res.status).toBe(400);
    });

    test("returns 400 for a country_iso longer than 2 characters", async () => {
      const userId = await createTestUser();
      const res = await request(app)
        .post(`${BASE}/${userId}/address`)
        .send(validAddressPayload({ country_iso: "BGD" }));
      expect(res.status).toBe(400);
    });
  });

  describe(`POST ${BASE}/:user_id/contact`, () => {
    test("creates a contact with no client-supplied id", async () => {
      const userId = await createTestUser();

      const res = await request(app)
        .post(`${BASE}/${userId}/contact`)
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
      const userId = await createTestUser();
      const res = await request(app).post(`${BASE}/${userId}/contact`).send({});
      expect(res.status).toBe(201);
    });

    test("returns 400 for an invalid social link url", async () => {
      const userId = await createTestUser();
      const res = await request(app)
        .post(`${BASE}/${userId}/contact`)
        .send({ socials: [{ type: "invalid-platform", url: "not-a-url" }] });
      expect(res.status).toBe(400);
    });

    test("returns 400 for a malformed user_id in the path", async () => {
      const res = await request(app)
        .post(`${BASE}/not-a-uuid/contact`)
        .send({ socials: [] });
      expect(res.status).toBe(400);
    });
  });

  describe(`POST ${BASE}/:user_id/contact/:contact_id/phone`, () => {
    test("creates a phone tied to a contact", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);

      const res = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/phone`)
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
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const res = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/phone`)
        .send(validPhonePayload({ phone_code: "" }));
      expect(res.status).toBe(400);
    });
  });

  describe(`POST ${BASE}/:user_id/contact/:contact_id/email`, () => {
    test("creates an email tied to a contact", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);

      const res = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/email`)
        .send(validEmailPayload());

      expect(res.status).toBe(201);
    });

    test("returns 400 for an invalid email", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const res = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/email`)
        .send({ email: "not-an-email" });
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------

  describe(`GET ${BASE}/core/:email`, () => {
    test("returns core user info for an authenticated request", async () => {
      const payload = validSignupPayload();
      const createRes = await request(app)
        .post(`${AUTH_BASE}/signup`)
        .send(payload);
      expect(createRes.status).toBe(201);

      const res = await request(app)
        .get(`${BASE}/core/${encodeURIComponent(payload.user.email)}`)
        .set("Cookie", buildAccessTokenCookie());

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(payload.user.email);
      expect(res.body.data.username).toBe(payload.user.username);
      expect(res.body.data).not.toHaveProperty("password");
    });

    test("returns 401 without an access token", async () => {
      const payload = validSignupPayload();
      await request(app).post(`${AUTH_BASE}/signup`).send(payload);

      const res = await request(app).get(
        `${BASE}/core/${encodeURIComponent(payload.user.email)}`
      );
      expect(res.status).toBe(401);
    });

    test("returns 404 for a nonexistent email", async () => {
      const res = await request(app)
        .get(`${BASE}/core/nobody-${crypto.randomUUID()}@example.com`)
        .set("Cookie", buildAccessTokenCookie());
      expect(res.status).toBe(404);
    });

    test("returns 400 for a malformed email", async () => {
      const res = await request(app)
        .get(`${BASE}/core/not-an-email`)
        .set("Cookie", buildAccessTokenCookie());
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------
  // Send Verification Code
  // ---------------------------------------------------------------
  // Note: there is no user-level "/:user_id/send-verification-code" route
  // on this router (only /phone/:id/... and /email/:id/...). Account-level
  // signup verification (AuthService.sendSignupCode/verifySignupCode)
  // presumably lives on a separate auth router — happy to add tests for it
  // once that route file is available.

  describe(`POST ${BASE}/:user_id/phone/:id/send-verification-code`, () => {
    test("sends a verification code for the phone", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const phoneRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/phone`)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const res = await request(app).post(
        `${BASE}/${userId}/phone/${phoneId}/send-verification-code`
      );
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
      const userId = await createTestUser();
      const res = await request(app).post(
        `${BASE}/${userId}/phone/${crypto.randomUUID()}/send-verification-code`
      );
      expect(res.status).toBe(404);
    });

    test("returns 404 when the phone belongs to a different user", async () => {
      const userId = await createTestUser();
      const otherUserId = await createTestUser();
      const contactId = await createTestContact(userId);
      const phoneRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/phone`)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const res = await request(app).post(
        `${BASE}/${otherUserId}/phone/${phoneId}/send-verification-code`
      );
      expect(res.status).toBe(404);
    });
  });

  describe(`POST ${BASE}/:user_id/email/:id/send-verification-code`, () => {
    test("sends a verification code for the email", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const emailRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/email`)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      const res = await request(app).post(
        `${BASE}/${userId}/email/${emailId}/send-verification-code`
      );
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
      const userId = await createTestUser();
      const res = await request(app).post(
        `${BASE}/${userId}/email/${crypto.randomUUID()}/send-verification-code`
      );
      expect(res.status).toBe(404);
    });

    test("returns 404 when the email belongs to a different user", async () => {
      const userId = await createTestUser();
      const otherUserId = await createTestUser();
      const contactId = await createTestContact(userId);
      const emailRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/email`)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      const res = await request(app).post(
        `${BASE}/${otherUserId}/email/${emailId}/send-verification-code`
      );
      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------
  // Verify
  // ---------------------------------------------------------------
  // Note: same as above — there is no user-level "/:user_id/verify" route
  // on this router, only /phone/:id/verify and /email/:id/verify.

  describe(`POST ${BASE}/:user_id/phone/:id/verify`, () => {
    test("verifies a phone with the correct code", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const phoneRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/phone`)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const code = await sendAndGetPhoneCode(userId, phoneId);

      const res = await request(app)
        .post(`${BASE}/${userId}/phone/${phoneId}/verify`)
        .send({ verify_code: code });
      expect(res.status).toBe(200);

      const [row] = await pgDb
        .select()
        .from(userPhonesTable)
        .where(eq(userPhonesTable.id, phoneId));
      expect(row?.is_verified).toBe(true);
    });

    test("returns 400 for the wrong code", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const phoneRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/phone`)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      await sendAndGetPhoneCode(userId, phoneId);

      const res = await request(app)
        .post(`${BASE}/${userId}/phone/${phoneId}/verify`)
        .send({ verify_code: "000000" });
      expect(res.status).toBe(400);
    });

    test("returns 400 for an expired code", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const phoneRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/phone`)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const code = await sendAndGetPhoneCode(userId, phoneId);
      // force-expire since the endpoint always issues a fresh future expiry
      await pgDb
        .update(userPhonesTable)
        .set({ verify_expiry: new Date(Date.now() - 60 * 1000) })
        .where(eq(userPhonesTable.id, phoneId));

      const res = await request(app)
        .post(`${BASE}/${userId}/phone/${phoneId}/verify`)
        .send({ verify_code: code });
      expect(res.status).toBe(400);
    });

    test("returns 404 for a nonexistent phone", async () => {
      const userId = await createTestUser();
      const res = await request(app)
        .post(`${BASE}/${userId}/phone/${crypto.randomUUID()}/verify`)
        .send({ verify_code: "123456" });
      expect(res.status).toBe(404);
    });

    test("returns 400 for a malformed code", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const phoneRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/phone`)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      await sendAndGetPhoneCode(userId, phoneId);

      const res = await request(app)
        .post(`${BASE}/${userId}/phone/${phoneId}/verify`)
        .send({ verify_code: "12" });
      expect(res.status).toBe(400);
    });

    test("returns 409 for an already-verified phone", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const phoneRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/phone`)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const code = await sendAndGetPhoneCode(userId, phoneId);
      await request(app)
        .post(`${BASE}/${userId}/phone/${phoneId}/verify`)
        .send({ verify_code: code });

      const res = await request(app)
        .post(`${BASE}/${userId}/phone/${phoneId}/verify`)
        .send({ verify_code: code });
      expect(res.status).toBe(409);
    });
  });

  describe(`POST ${BASE}/:user_id/email/:id/verify`, () => {
    test("verifies an email with the correct code", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const emailRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/email`)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      const code = await sendAndGetEmailCode(userId, emailId);

      const res = await request(app)
        .post(`${BASE}/${userId}/email/${emailId}/verify`)
        .send({ verify_code: code });
      expect(res.status).toBe(200);

      const [row] = await pgDb
        .select()
        .from(userEmailsTable)
        .where(eq(userEmailsTable.id, emailId));
      expect(row?.is_verified).toBe(true);
    });

    test("returns 400 for the wrong code", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const emailRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/email`)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      await sendAndGetEmailCode(userId, emailId);

      const res = await request(app)
        .post(`${BASE}/${userId}/email/${emailId}/verify`)
        .send({ verify_code: "000000" });
      expect(res.status).toBe(400);
    });

    test("returns 400 for an expired code", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const emailRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/email`)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      const code = await sendAndGetEmailCode(userId, emailId);
      await pgDb
        .update(userEmailsTable)
        .set({ verify_expiry: new Date(Date.now() - 60 * 1000) })
        .where(eq(userEmailsTable.id, emailId));

      const res = await request(app)
        .post(`${BASE}/${userId}/email/${emailId}/verify`)
        .send({ verify_code: code });
      expect(res.status).toBe(400);
    });

    test("returns 404 for a nonexistent email", async () => {
      const userId = await createTestUser();
      const res = await request(app)
        .post(`${BASE}/${userId}/email/${crypto.randomUUID()}/verify`)
        .send({ verify_code: "123456" });
      expect(res.status).toBe(404);
    });

    test("returns 409 for an already-verified email", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const emailRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/email`)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      const code = await sendAndGetEmailCode(userId, emailId);
      await request(app)
        .post(`${BASE}/${userId}/email/${emailId}/verify`)
        .send({ verify_code: code });

      const res = await request(app)
        .post(`${BASE}/${userId}/email/${emailId}/verify`)
        .send({ verify_code: code });
      expect(res.status).toBe(409);
    });
  });

  // ---------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------

  describe(`PATCH ${BASE}/:user_id/profile`, () => {
    test("updates the profile", async () => {
      const userId = await createTestUser();
      const [existing] = await pgDb
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.user_id, userId));

      const res = await request(app)
        .patch(`${BASE}/${userId}/profile`)
        .send({ id: existing!.id, first_name: "Updated" });
      expect(res.status).toBe(200);

      const [row] = await pgDb
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.user_id, userId));
      expect(row?.first_name).toBe("Updated");
    });

    test("returns 400 when id is missing from the body", async () => {
      const userId = await createTestUser();
      const res = await request(app)
        .patch(`${BASE}/${userId}/profile`)
        .send({ first_name: "Nobody" });
      expect(res.status).toBe(400);
    });

    test("returns 404 for a user with no profile row", async () => {
      const res = await request(app)
        .patch(`${BASE}/${crypto.randomUUID()}/profile`)
        .send({ id: crypto.randomUUID(), first_name: "Nobody" });
      expect(res.status).toBe(404);
    });
  });

  describe(`PATCH ${BASE}/:user_id/address/:id`, () => {
    test("updates the address", async () => {
      const userId = await createTestUser();
      const createRes = await request(app)
        .post(`${BASE}/${userId}/address`)
        .send(validAddressPayload());
      const addressId = createRes.body.data.id as string;

      const res = await request(app)
        .patch(`${BASE}/${userId}/address/${addressId}`)
        .send({ city: "Chattogram" });
      expect(res.status).toBe(200);

      const [row] = await pgDb
        .select()
        .from(userAddressesTable)
        .where(eq(userAddressesTable.id, addressId));
      expect(row?.city).toBe("Chattogram");
    });

    test("returns 404 for a nonexistent address", async () => {
      const userId = await createTestUser();
      const res = await request(app)
        .patch(`${BASE}/${userId}/address/${crypto.randomUUID()}`)
        .send({ city: "Nowhere" });
      expect(res.status).toBe(404);
    });
  });

  describe(`PATCH ${BASE}/:user_id/contact`, () => {
    test("updates the contact", async () => {
      const userId = await createTestUser();
      await createTestContact(userId);

      const res = await request(app)
        .patch(`${BASE}/${userId}/contact`)
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
      const userId = await createTestUser();
      const res = await request(app)
        .patch(`${BASE}/${userId}/contact`)
        .send({ socials: [] });
      expect(res.status).toBe(404);
    });
  });

  describe(`PATCH ${BASE}/:user_id/phone/:id`, () => {
    test("updates the phone", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const phoneRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/phone`)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const res = await request(app)
        .patch(`${BASE}/${userId}/phone/${phoneId}`)
        .send({ phone: "1999999999" });
      expect(res.status).toBe(200);

      const [row] = await pgDb
        .select()
        .from(userPhonesTable)
        .where(eq(userPhonesTable.id, phoneId));
      expect(row?.phone).toBe("1999999999");
    });

    test("returns 404 for a nonexistent phone", async () => {
      const userId = await createTestUser();
      const res = await request(app)
        .patch(`${BASE}/${userId}/phone/${crypto.randomUUID()}`)
        .send({ phone: "1999999999" });
      expect(res.status).toBe(404);
    });
  });

  describe(`PATCH ${BASE}/:user_id/email/:id`, () => {
    test("updates the email", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const emailRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/email`)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      const newEmail = `updated-${crypto.randomUUID()}@example.com`;
      const res = await request(app)
        .patch(`${BASE}/${userId}/email/${emailId}`)
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

  describe(`DELETE ${BASE}/:user_id`, () => {
    test("deletes the user", async () => {
      const userId = await createTestUser();
      const res = await request(app).delete(`${BASE}/${userId}`);
      expect(res.status).toBe(200);

      const rows = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));
      expect(rows).toHaveLength(0);
    });

    test("returns 404 for a nonexistent user", async () => {
      const res = await request(app).delete(`${BASE}/${crypto.randomUUID()}`);
      expect(res.status).toBe(404);
    });

    test("returns 400 for a malformed user id", async () => {
      const res = await request(app).delete(`${BASE}/not-a-uuid`);
      expect(res.status).toBe(400);
    });
  });

  describe(`DELETE ${BASE}/:user_id/address/:id`, () => {
    test("deletes the address", async () => {
      const userId = await createTestUser();
      const createRes = await request(app)
        .post(`${BASE}/${userId}/address`)
        .send(validAddressPayload());
      const addressId = createRes.body.data.id as string;

      const res = await request(app).delete(
        `${BASE}/${userId}/address/${addressId}`
      );
      expect(res.status).toBe(200);
    });

    test("returns 404 for a nonexistent address", async () => {
      const userId = await createTestUser();
      const res = await request(app).delete(
        `${BASE}/${userId}/address/${crypto.randomUUID()}`
      );
      expect(res.status).toBe(404);
    });
  });

  describe(`DELETE ${BASE}/:user_id/contact/:id`, () => {
    test("deletes the contact", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);

      const res = await request(app).delete(
        `${BASE}/${userId}/contact/${contactId}`
      );
      expect(res.status).toBe(200);
    });

    test("returns 404 for a nonexistent contact", async () => {
      const userId = await createTestUser();
      const res = await request(app).delete(
        `${BASE}/${userId}/contact/${crypto.randomUUID()}`
      );
      expect(res.status).toBe(404);
    });
  });

  describe(`DELETE ${BASE}/:user_id/phone/:id`, () => {
    test("deletes the phone", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const phoneRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/phone`)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const res = await request(app).delete(
        `${BASE}/${userId}/phone/${phoneId}`
      );
      expect(res.status).toBe(200);
    });
  });

  describe(`DELETE ${BASE}/:user_id/email/:id`, () => {
    test("deletes the email", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const emailRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/email`)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      const res = await request(app).delete(
        `${BASE}/${userId}/email/${emailId}`
      );
      expect(res.status).toBe(200);
    });
  });
});
