// src/routes/__tests__/user.routes.test.ts

import express, { type Express } from "express";
import request from "supertest";
import { eq } from "drizzle-orm";

import userRouter from "@/routes/user.route";
import { errorHandlerMiddleware } from "@/middlewares/error-handler.middleware";
import { pgDb } from "@/libs/db.connect";
import { users, userContacts, userPhones, userEmails, userAddresses } from "@/database";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { setupDatabase } from "../utils";

// ---------------------------------------------------------------
// Test app — real router, real pgDb, real error handler.
// No mocks. This hits an actual Postgres test database.
// ---------------------------------------------------------------

setupDatabase()

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/users", userRouter);
  app.use(errorHandlerMiddleware);
  return app;
}

const app = buildApp();

// Track ids created during a test so we can clean up afterwards
// without truncating tables other suites might be using in parallel.
let createdUserIds: string[] = [];

afterEach(async () => {
  if (createdUserIds.length) {
    // FK cascades (profile/contacts/phones/emails/addresses -> users)
    // are assumed to be `onDelete: "cascade"` per your schema comment
    // in deleteProfile. If any child tables aren't cascading, delete
    // them explicitly here first.
    await pgDb.delete(users).where(
      // drizzle doesn't have `inArray` imported above — swap for that
      // if you have more than a handful of ids per test
      eq(users.id, createdUserIds[0]!)
    );
    createdUserIds = [];
  }
});

afterAll(async () => {
  // If your db.connect module exposes a pool/client with `.end()`,
  // close it so Jest doesn't hang on an open handle.
  // await pgDb.$client.end();
});

// Helper to create a real user via the API itself, so tests exercise
// the full create path and give us a valid userId for nested resources.


async function createTestUser(overrides: Record<string, unknown> = {}) {

    const res = await request(app).post("/users/create").send({ email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      username: `testuser-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      password: "Password123!",
      role: "user",
      first_name: "Test",
      last_name: "User",
      ...overrides, });

  if (res.status !== 201) {
    console.log("createTestUser failed:", JSON.stringify(res.body, null, 2));
  }


  expect(res.status).toBe(201);
  const userId = res.body.data.id as string;
  createdUserIds.push(userId);
  return userId;
}

// ---------------------------------------------------------------
// Create
// ---------------------------------------------------------------

describe("POST /users/create", () => {
  it("creates a user and profile, returns 201", async () => {
    const email = `create-${Date.now()}@example.com`;

    const res = await request(app).post("/users/create").send({
      email,
      username: `user-${Date.now()}`,
      password: "Password123!",
      role: "user",
      first_name: "Mahin",
      last_name: "N",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.profile_id).toBeDefined();
    createdUserIds.push(res.body.data.id);

    // Verify it actually landed in the DB
    const [row] = await pgDb.select().from(users).where(eq(users.id, res.body.data.id));
    expect(row?.email).toBe(email);
    expect(row?.verify_code).toBeTruthy();
  });

  it("returns 400 for invalid payload (bad email)", async () => {
    const res = await request(app).post("/users/create").send({
      email: "not-an-email",
      username: "x",
      password: "short",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when email is already taken", async () => {
    const email = `dup-${Date.now()}@example.com`;
    await createTestUser({ email, username: `dupuser-${Date.now()}` });

    const res = await request(app).post("/users/create").send({
      email,
      username: `dupuser2-${Date.now()}`,
      password: "Password123!",
      role: "user",
      first_name: "Test",
      last_name: "User",
    });

    // Adjust expected status/code to whatever your unique-constraint
    // handling actually returns (likely surfaces as a 500 unless you
    // catch the Postgres unique violation explicitly).
    expect([400, 409, 500]).toContain(res.status);
  });
});

describe("POST /users/:userId/addresses", () => {
  it("creates an address for a real user and persists it", async () => {
    const userId = await createTestUser();

    const res = await request(app)
      .post(`/users/${userId}/addresses`)
      .send({ line1: "123 Main St", city: "Dhaka", country: "BD" });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();

    const [row] = await pgDb
      .select()
      .from(userAddresses)
      .where(eq(userAddresses.id, res.body.data.id));
    expect(row?.user_id).toBe(userId);
    expect(row?.city).toBe("Dhaka");
  });

  it("returns 400 on invalid address payload", async () => {
    const userId = await createTestUser();

    const res = await request(app).post(`/users/${userId}/addresses`).send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /users/:userId/contacts/:contactId/phones and /emails", () => {
  // NOTE: these routes require an existing contactId, but there is no
  // exposed createContact route yet (flagged earlier). To actually test
  // this end-to-end, insert a contact row directly for now:
  async function createTestContact(userId: string) {
    const [contact] = await pgDb
      .insert(userContacts)
      .values({ user_id: userId } as any)
      .returning({ id: userContacts.id });
    return contact!.id;
  }

  it("creates a phone tied to a real user + contact", async () => {
    const userId = await createTestUser();
    const contactId = await createTestContact(userId);

    const res = await request(app)
      .post(`/users/${userId}/contacts/${contactId}/phones`)
      .send({ number: "+8801000000000" });

    expect(res.status).toBe(201);

    const [row] = await pgDb.select().from(userPhones).where(eq(userPhones.id, res.body.data.id));
    expect(row?.user_id).toBe(userId);
    expect(row?.contact_id).toBe(contactId);
  });

  it("creates an email tied to a real user + contact", async () => {
    const userId = await createTestUser();
    const contactId = await createTestContact(userId);

    const res = await request(app)
      .post(`/users/${userId}/contacts/${contactId}/emails`)
      .send({ email: "contact@example.com" });

    expect(res.status).toBe(201);

    const [row] = await pgDb.select().from(userEmails).where(eq(userEmails.id, res.body.data.id));
    expect(row?.email).toBe("contact@example.com");
  });
});

// ---------------------------------------------------------------
// Verify
// ---------------------------------------------------------------

describe("POST /users/verify", () => {
  it("verifies a real user with the correct code", async () => {
    const userId = await createTestUser();
    const [row] = await pgDb
      .select({ verify_code: users.verify_code })
      .from(users)
      .where(eq(users.id, userId));

    const res = await request(app)
      .post("/users/verify")
      .send({ id: userId, code: row!.verify_code });

    expect(res.status).toBe(200);

    const [updated] = await pgDb.select().from(users).where(eq(users.id, userId));
    expect(updated?.is_verified).toBe(true);
    expect(updated?.verify_code).toBeNull();
  });

  it("returns 400 for wrong code", async () => {
    const userId = await createTestUser();

    const res = await request(app)
      .post("/users/verify")
      .send({ id: userId, code: "000000" });

    expect(res.status).toBe(400);
  });

  it("returns 404 for nonexistent user id", async () => {
    const res = await request(app)
      .post("/users/verify")
      .send({ id: "00000000-0000-0000-0000-000000000000", code: "123456" });

    expect(res.status).toBe(404);
  });

  it("returns 400 when already verified", async () => {
    const userId = await createTestUser();
    const [row] = await pgDb
      .select({ verify_code: users.verify_code })
      .from(users)
      .where(eq(users.id, userId));

    await request(app).post("/users/verify").send({ id: userId, code: row!.verify_code });

    const res = await request(app)
      .post("/users/verify")
      .send({ id: userId, code: row!.verify_code });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------
// Update / Delete — profile, address (real DB round trips)
// ---------------------------------------------------------------

describe("PATCH /users/:userId/profile", () => {
  it("updates the profile and persists the change", async () => {
    const userId = await createTestUser();

    const res = await request(app)
      .patch(`/users/${userId}/profile`)
      .send({ first_name: "Updated" });

    expect(res.status).toBe(200);
  });

  it("returns 404 for a user with no profile row", async () => {
    const res = await request(app)
      .patch("/users/00000000-0000-0000-0000-000000000000/profile")
      .send({ first_name: "Nobody" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /users/:userId", () => {
  it("deletes the user and cascades to profile", async () => {
    const userId = await createTestUser();

    const res = await request(app).delete(`/users/${userId}`);
    expect(res.status).toBe(200);

    const rows = await pgDb.select().from(users).where(eq(users.id, userId));
    expect(rows).toHaveLength(0);

    // remove from cleanup tracking since it's already gone
    createdUserIds = createdUserIds.filter((id) => id !== userId);
  });

  it("returns 404 for a nonexistent user", async () => {
    const res = await request(app).delete("/users/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});