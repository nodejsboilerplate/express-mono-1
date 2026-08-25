import express, { type Express } from "express";
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

// ---------------------------------------------------------------
// Payload builders
// ---------------------------------------------------------------

function validUserPayload(overrides: Partial<any> = {}) {
  return {
    email: `test-${crypto.randomUUID()}@example.com`,
    username: `user_${crypto.randomUUID().slice(0, 8)}`,
    password: "SuperSecret123!",
    role: "USER",
    first_name: "Mahin", // required by createProfile
    last_name: "N",
    ...overrides,
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

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ---------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------

async function createTestUser(overrides: Partial<any> = {}) {
  const res = await request(app).post(BASE).send(validUserPayload(overrides));

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

// Since createPhoneHandler/createEmailHandler don't currently set
// verify_code/verify_expiry on insert, seed them directly for tests
// that need to exercise the actual verify-success path.
async function seedPhoneVerifyCode(
  phoneId: string,
  code: string,
  expiresInMs = 10 * 60 * 1000
) {
  await pgDb
    .update(userPhonesTable)
    .set({
      verify_code: code,
      verify_expiry: new Date(Date.now() + expiresInMs),
    })
    .where(eq(userPhonesTable.id, phoneId));
}

async function seedEmailVerifyCode(
  emailId: string,
  code: string,
  expiresInMs = 10 * 60 * 1000
) {
  await pgDb
    .update(userEmailsTable)
    .set({
      verify_code: code,
      verify_expiry: new Date(Date.now() + expiresInMs),
    })
    .where(eq(userEmailsTable.id, emailId));
}

// ---------------------------------------------------------------
// Create
// ---------------------------------------------------------------
describe("User API Test", { tags: ["apis/user"] }, () => {
  describe(`POST ${BASE}`, () => {
    test("creates a user and profile, returns 201", async () => {
      const res = await request(app).post(BASE).send(validUserPayload());

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeTypeOf("string");
      expect(res.body.data.profile_id).toBeTypeOf("string");

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
        .post(BASE)
        .send(validUserPayload({ email: "not-an-email" }));
      expect(res.status).toBe(400);
    });

    test("returns 400 when first_name is missing (required by createProfile)", async () => {
      const { first_name, ...payload } = validUserPayload();
      const res = await request(app).post(BASE).send(payload);
      expect(res.status).toBe(400);
    });

    test("returns 400 for a username with disallowed characters", async () => {
      const res = await request(app)
        .post(BASE)
        .send(validUserPayload({ username: "bad-username!" }));
      expect(res.status).toBe(400);
    });

    test("returns 400 for a password under 8 characters", async () => {
      const res = await request(app)
        .post(BASE)
        .send(validUserPayload({ password: "short" }));
      expect(res.status).toBe(400);
    });

    test("returns 400/409/500 when email is already taken", async () => {
      const payload = validUserPayload();
      const first = await request(app).post(BASE).send(payload);
      expect(first.status).toBe(201);

      const second = await request(app)
        .post(BASE)
        .send(validUserPayload({ email: payload.email }));
      expect([400, 409, 500]).toContain(second.status);
    });
  });

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

  describe(`POST ${BASE}/:user_id/contact/:contactId/phone`, () => {
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

  describe(`POST ${BASE}/:user_id/contact/:contactId/email`, () => {
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
  // Verify
  // ---------------------------------------------------------------

  describe(`POST ${BASE}/:id/verify (user)`, () => {
    test("verifies a user with the correct code", async () => {
      const userId = await createTestUser();
      const [row] = await pgDb
        .select({ verify_code: usersTable.verify_code })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      const res = await request(app)
        .post(`${BASE}/${userId}/verify`)
        .send({ code: row!.verify_code });
      expect(res.status).toBe(200);

      const [updated] = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));
      expect(updated?.is_verified).toBe(true);
      expect(updated?.verify_code).toBeNull();
    });

    test("returns 400 for the wrong code", async () => {
      const userId = await createTestUser();
      const res = await request(app)
        .post(`${BASE}/${userId}/verify`)
        .send({ code: "000000" });
      expect(res.status).toBe(400);
    });

    test("returns 400 for a malformed code (not 6 digits)", async () => {
      const userId = await createTestUser();
      const res = await request(app)
        .post(`${BASE}/${userId}/verify`)
        .send({ code: "abc" });
      expect(res.status).toBe(400);
    });

    test("returns 404 for a well-formed but nonexistent user id", async () => {
      const res = await request(app)
        .post(`${BASE}/${crypto.randomUUID()}/verify`)
        .send({ code: "123456" });
      expect(res.status).toBe(404);
    });

    test("returns 400 for a malformed user id in the path", async () => {
      const res = await request(app)
        .post(`${BASE}/not-a-uuid/verify`)
        .send({ code: "123456" });
      expect(res.status).toBe(400);
    });

    test("returns 400 for an already-verified user", async () => {
      const userId = await createTestUser();
      const [row] = await pgDb
        .select({ verify_code: usersTable.verify_code })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      await request(app)
        .post(`${BASE}/${userId}/verify`)
        .send({ code: row!.verify_code });
      const res = await request(app)
        .post(`${BASE}/${userId}/verify`)
        .send({ code: row!.verify_code });

      expect(res.status).toBe(400);
    });
  });

  // TODO: createPhoneHandler currently never sets verify_code/verify_expiry
  // on the phone row at creation time, so there's no way to reach a real
  // 200 through the API alone yet - these tests seed the code directly via
  // pgDb to exercise the verify logic itself. Flag: creation should
  // probably generate + store a code the same way createUserHandler does.
  describe(`POST ${BASE}/:user_id/phone/:id/verify`, () => {
    test("verifies a phone with the correct code", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const phoneRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/phone`)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const code = randomCode();
      await seedPhoneVerifyCode(phoneId, code);

      const res = await request(app)
        .post(`${BASE}/${userId}/phone/${phoneId}/verify`)
        .send({ code });
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

      await seedPhoneVerifyCode(phoneId, randomCode());

      const res = await request(app)
        .post(`${BASE}/${userId}/phone/${phoneId}/verify`)
        .send({ code: "000000" });
      expect(res.status).toBe(400);
    });

    test("returns 400 for an expired code", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const phoneRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/phone`)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const code = randomCode();
      await seedPhoneVerifyCode(phoneId, code, -60 * 1000); // already expired

      const res = await request(app)
        .post(`${BASE}/${userId}/phone/${phoneId}/verify`)
        .send({ code });
      expect(res.status).toBe(400);
    });

    test("returns 404 for a nonexistent phone", async () => {
      const userId = await createTestUser();
      const res = await request(app)
        .post(`${BASE}/${userId}/phone/${crypto.randomUUID()}/verify`)
        .send({ code: "123456" });
      expect(res.status).toBe(404);
    });

    test("returns 400 for a malformed code", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const phoneRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/phone`)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const res = await request(app)
        .post(`${BASE}/${userId}/phone/${phoneId}/verify`)
        .send({ code: "12" });
      expect(res.status).toBe(400);
    });

    test("returns 409 for an already-verified phone", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const phoneRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/phone`)
        .send(validPhonePayload());
      const phoneId = phoneRes.body.data.id as string;

      const code = randomCode();
      await seedPhoneVerifyCode(phoneId, code);
      await request(app)
        .post(`${BASE}/${userId}/phone/${phoneId}/verify`)
        .send({ code });

      await seedPhoneVerifyCode(phoneId, code); // re-seed so it's not the expired/missing-code branch
      const res = await request(app)
        .post(`${BASE}/${userId}/phone/${phoneId}/verify`)
        .send({ code });
      expect(res.status).toBe(409);
    });
  });

  // Same seeding caveat as phone verify above - see TODO there.
  describe(`POST ${BASE}/:user_id/email/:id/verify`, () => {
    test("verifies an email with the correct code", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const emailRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/email`)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      const code = randomCode();
      await seedEmailVerifyCode(emailId, code);

      const res = await request(app)
        .post(`${BASE}/${userId}/email/${emailId}/verify`)
        .send({ code });
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

      await seedEmailVerifyCode(emailId, randomCode());

      const res = await request(app)
        .post(`${BASE}/${userId}/email/${emailId}/verify`)
        .send({ code: "000000" });
      expect(res.status).toBe(400);
    });

    test("returns 400 for an expired code", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const emailRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/email`)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      const code = randomCode();
      await seedEmailVerifyCode(emailId, code, -60 * 1000);

      const res = await request(app)
        .post(`${BASE}/${userId}/email/${emailId}/verify`)
        .send({ code });
      expect(res.status).toBe(400);
    });

    test("returns 404 for a nonexistent email", async () => {
      const userId = await createTestUser();
      const res = await request(app)
        .post(`${BASE}/${userId}/email/${crypto.randomUUID()}/verify`)
        .send({ code: "123456" });
      expect(res.status).toBe(404);
    });

    test("returns 409 for an already-verified email", async () => {
      const userId = await createTestUser();
      const contactId = await createTestContact(userId);
      const emailRes = await request(app)
        .post(`${BASE}/${userId}/contact/${contactId}/email`)
        .send(validEmailPayload());
      const emailId = emailRes.body.data.id as string;

      const code = randomCode();
      await seedEmailVerifyCode(emailId, code);
      await request(app)
        .post(`${BASE}/${userId}/email/${emailId}/verify`)
        .send({ code });

      await seedEmailVerifyCode(emailId, code);
      const res = await request(app)
        .post(`${BASE}/${userId}/email/${emailId}/verify`)
        .send({ code });
      expect(res.status).toBe(409);
    });
  });

  // ---------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------

  describe(`PATCH ${BASE}/:user_id/profile`, () => {
    test("updates the profile", async () => {
      const userId = await createTestUser();
      const res = await request(app)
        .patch(`${BASE}/${userId}/profile`)
        .send({ id: crypto.randomUUID(), first_name: "Updated" });
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
