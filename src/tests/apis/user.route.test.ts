// src/tests/apis/user.route.test.ts

import express, { type Express } from "express";
import request from "supertest";
import { describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";

import { setupDatabase } from "../utils";
import userRouter from "@/routes/user.route";
import { errorHandlerMiddleware } from "@/middlewares/error-handler.middleware";
import {
  users,
  userProfiles,
  userContacts,
  userPhones,
  userEmails,
  userAddresses,
} from "@/database";
import { pgDb } from "@/libs/db.connect";

setupDatabase();

// Mirrors the real mount path: app.use("/api", routers) -> routers has
// router.use("/v1/user", userRouter) -> full path is /api/v1/user/...
const BASE = "/api/v1/user";

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(BASE, userRouter);
  app.use(errorHandlerMiddleware);
  return app;
}

const app = buildApp();

// ---------------------------------------------------------------
// Payload builders
// ---------------------------------------------------------------

function validUserPayload(overrides: Partial<any> = {}) {
  return {
    email: `test-${crypto.randomUUID()}@example.com`,
    username: `user_${crypto.randomUUID().slice(0, 8)}`,
    password: "SuperSecret123!",
    role: "USER",
    first_name: "Mahin",
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

// ---------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------

async function createTestUser(overrides: Partial<any> = {}) {
  const res = await request(app).post(BASE).send(validUserPayload(overrides));

  if (res.status !== 201) {
    console.log("createTestUser failed:", res.status, JSON.stringify(res.body, null, 2));
  }

  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

async function createTestContact(userId: string) {
  const res = await request(app)
    .post(`${BASE}/${userId}/contact`)
    .send({ id: crypto.randomUUID(), socials: [] });

  if (res.status !== 201) {
    console.log("createTestContact failed:", res.status, JSON.stringify(res.body, null, 2));
  }

  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

// ---------------------------------------------------------------
// Create
// ---------------------------------------------------------------

describe(`POST ${BASE}`, () => {
  test("creates a user and profile, returns 201", async () => {
    const res = await request(app).post(BASE).send(validUserPayload());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.profile_id).toBeDefined();

    const [row] = await pgDb.select().from(users).where(eq(users.id, res.body.data.id));
    expect(row?.role).toBe("USER");
    expect(row?.is_verified).toBe(false);
  });

  test("returns 400 for invalid email", async () => {
    const res = await request(app).post(BASE).send(validUserPayload({ email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  test("returns 400 for a username with disallowed characters", async () => {
    const res = await request(app).post(BASE).send(validUserPayload({ username: "bad-username!" }));
    expect(res.status).toBe(400);
  });

  test("returns 400 for a password under 8 characters", async () => {
    const res = await request(app).post(BASE).send(validUserPayload({ password: "short" }));
    expect(res.status).toBe(400);
  });

  test("returns 400/409/500 when email is already taken", async () => {
    const payload = validUserPayload();
    const first = await request(app).post(BASE).send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post(BASE).send(validUserPayload({ email: payload.email }));
    expect([400, 409, 500]).toContain(second.status);
  });
});

describe(`POST ${BASE}/:userId/address`, () => {
  test("creates an address and persists it", async () => {
    const userId = await createTestUser();

    const res = await request(app).post(`${BASE}/${userId}/address`).send(validAddressPayload());

    expect(res.status).toBe(201);

    const [row] = await pgDb.select().from(userAddresses).where(eq(userAddresses.id, res.body.data.id));
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

describe(`POST ${BASE}/:userId/contact`, () => {
  test("creates a contact and persists it", async () => {
    const userId = await createTestUser();

    const res = await request(app).post(`${BASE}/${userId}/contact`).send({ id: userId, socials: [] });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeTypeOf("string");
  });

  test("returns 400 when id is missing", async () => {
    const userId = " "
    const res = await request(app).post(`${BASE}/${userId}/contact`).send({ socials: [] });
    expect(res.status).toBe(400);
  });

  test("returns 400 for an invalid social link url", async () => {
    const userId = await createTestUser();
    const res = await request(app)
      .post(`${BASE}/${userId}/contact`)
      .send({ id: crypto.randomUUID(), socials: [{ type: "invalid-platform", url: "not-a-url" }] });
    expect(res.status).toBe(400);
  });
});

describe(`POST ${BASE}/:userId/contact/:contactId/phone`, () => {
  test("creates a phone tied to a contact", async () => {
    const userId = await createTestUser();
    const contactId = await createTestContact(userId);

    const res = await request(app)
      .post(`${BASE}/${userId}/contact/${contactId}/phone`)
      .send(validPhonePayload());

    expect(res.status).toBe(201);

    const [row] = await pgDb.select().from(userPhones).where(eq(userPhones.id, res.body.data.id));
    expect(row?.contact_id).toBe(contactId);
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

describe(`POST ${BASE}/:userId/contact/:contactId/email`, () => {
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

describe(`POST ${BASE}/verify`, () => {
  test("verifies a user with the correct code", async () => {
    const userId = await createTestUser();
    const [row] = await pgDb.select({ verify_code: users.verify_code }).from(users).where(eq(users.id, userId));

    const res = await request(app).post(`${BASE}/verify`).send({ id: userId, code: row!.verify_code });
    expect(res.status).toBe(200);
  });

  test("returns 400 for the wrong code", async () => {
    const userId = await createTestUser();
    const res = await request(app).post(`${BASE}/verify`).send({ id: userId, code: "000000" });
    expect(res.status).toBe(400);
  });

  test("returns 404 for a well-formed but nonexistent user id", async () => {
    const res = await request(app).post(`${BASE}/verify`).send({ id: crypto.randomUUID(), code: "123456" });
    expect(res.status).toBe(404);
  });
});

describe(`POST ${BASE}/:userId/phone/:id/verify`, () => {
  test("verifies a phone with a code", async () => {
    const userId = await createTestUser();
    const contactId = await createTestContact(userId);
    const phoneRes = await request(app)
      .post(`${BASE}/${userId}/contact/${contactId}/phone`)
      .send(validPhonePayload());
    const phoneId = phoneRes.body.data.id as string;

    const res = await request(app).post(`${BASE}/${userId}/phone/${phoneId}/verify`).send({ code: "123456" });
    expect(res.status).toBe(200);
  });
});

describe(`POST ${BASE}/:userId/email/:id/verify`, () => {
  test("verifies an email with a code", async () => {
    const userId = await createTestUser();
    const contactId = await createTestContact(userId);
    const emailRes = await request(app)
      .post(`${BASE}/${userId}/contact/${contactId}/email`)
      .send(validEmailPayload());
    const emailId = emailRes.body.data.id as string;

    const res = await request(app).post(`${BASE}/${userId}/email/${emailId}/verify`).send({ code: "123456" });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------
// Update
// ---------------------------------------------------------------

describe(`PATCH ${BASE}/:userId/profile`, () => {
  test("updates the profile", async () => {
    const userId = await createTestUser();
    const res = await request(app)
      .patch(`${BASE}/${userId}/profile`)
      .send({ id: crypto.randomUUID(), first_name: "Updated" });
    expect(res.status).toBe(200);
  });

  test("returns 404 for a user with no profile row", async () => {
    const res = await request(app)
      .patch(`${BASE}/${crypto.randomUUID()}/profile`)
      .send({ id: crypto.randomUUID(), first_name: "Nobody" });
    expect(res.status).toBe(404);
  });
});

describe(`PATCH ${BASE}/:userId/address/:id`, () => {
  test("updates the address", async () => {
    const userId = await createTestUser();
    const createRes = await request(app).post(`${BASE}/${userId}/address`).send(validAddressPayload());
    const addressId = createRes.body.data.id as string;

    const res = await request(app).patch(`${BASE}/${userId}/address/${addressId}`).send({ city: "Chattogram" });
    expect(res.status).toBe(200);
  });

  test("returns 404 for a nonexistent address", async () => {
    const userId = await createTestUser();
    const res = await request(app)
      .patch(`${BASE}/${userId}/address/${crypto.randomUUID()}`)
      .send({ city: "Nowhere" });
    expect(res.status).toBe(404);
  });
});

describe(`PATCH ${BASE}/:userId/contact`, () => {
  test("updates the contact", async () => {
    const userId = await createTestUser();
    await createTestContact(userId);

    const res = await request(app)
      .patch(`${BASE}/${userId}/contact`)
      .send({ id: crypto.randomUUID(), socials: [] });
    expect(res.status).toBe(200);
  });
});

describe(`PATCH ${BASE}/:userId/phone/:id`, () => {
  test("updates the phone", async () => {
    const userId = await createTestUser();
    const contactId = await createTestContact(userId);
    const phoneRes = await request(app)
      .post(`${BASE}/${userId}/contact/${contactId}/phone`)
      .send(validPhonePayload());
    const phoneId = phoneRes.body.data.id as string;

    const res = await request(app).patch(`${BASE}/${userId}/phone/${phoneId}`).send({ phone: "1999999999" });
    expect(res.status).toBe(200);
  });

  test("returns 404 for a nonexistent phone", async () => {
    const userId = await createTestUser();
    const res = await request(app)
      .patch(`${BASE}/${userId}/phone/${crypto.randomUUID()}`)
      .send({ phone: "1999999999" });
    expect(res.status).toBe(404);
  });
});

describe(`PATCH ${BASE}/:userId/email/:id`, () => {
  test("updates the email", async () => {
    const userId = await createTestUser();
    const contactId = await createTestContact(userId);
    const emailRes = await request(app)
      .post(`${BASE}/${userId}/contact/${contactId}/email`)
      .send(validEmailPayload());
    const emailId = emailRes.body.data.id as string;

    const res = await request(app)
      .patch(`${BASE}/${userId}/email/${emailId}`)
      .send({ email: `updated-${crypto.randomUUID()}@example.com` });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------
// Delete
// ---------------------------------------------------------------

describe(`DELETE ${BASE}/:userId`, () => {
  test("deletes the user", async () => {
    const userId = await createTestUser();
    const res = await request(app).delete(`${BASE}/${userId}`);
    expect(res.status).toBe(200);
  });

  test("returns 404 for a nonexistent user", async () => {
    const res = await request(app).delete(`${BASE}/${crypto.randomUUID()}`);
    expect(res.status).toBe(404);
  });
});

describe(`DELETE ${BASE}/:userId/address/:id`, () => {
  test("deletes the address", async () => {
    const userId = await createTestUser();
    const createRes = await request(app).post(`${BASE}/${userId}/address`).send(validAddressPayload());
    const addressId = createRes.body.data.id as string;

    const res = await request(app).delete(`${BASE}/${userId}/address/${addressId}`);
    expect(res.status).toBe(200);
  });
});

describe(`DELETE ${BASE}/:userId/contact/:id`, () => {
  test("deletes the contact", async () => {
    const userId = await createTestUser();
    const contactId = await createTestContact(userId);

    const res = await request(app).delete(`${BASE}/${userId}/contact/${contactId}`);
    expect(res.status).toBe(200);
  });
});

describe(`DELETE ${BASE}/:userId/phone/:id`, () => {
  test("deletes the phone", async () => {
    const userId = await createTestUser();
    const contactId = await createTestContact(userId);
    const phoneRes = await request(app)
      .post(`${BASE}/${userId}/contact/${contactId}/phone`)
      .send(validPhonePayload());
    const phoneId = phoneRes.body.data.id as string;

    const res = await request(app).delete(`${BASE}/${userId}/phone/${phoneId}`);
    expect(res.status).toBe(200);
  });
});

describe(`DELETE ${BASE}/:userId/email/:id`, () => {
  test("deletes the email", async () => {
    const userId = await createTestUser();
    const contactId = await createTestContact(userId);
    const emailRes = await request(app)
      .post(`${BASE}/${userId}/contact/${contactId}/email`)
      .send(validEmailPayload());
    const emailId = emailRes.body.data.id as string;

    const res = await request(app).delete(`${BASE}/${userId}/email/${emailId}`);
    expect(res.status).toBe(200);
  });
});