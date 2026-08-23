import { setupDatabase } from '../utils'
import { describe, expect, test } from "vitest";
import { pgDb } from "@/libs/db.connect";
import { UserService } from "@/services/user.service";
import { users, userContacts } from "@/database";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import {v4 as uuidv4} from "uuid"

setupDatabase()

const userService = new UserService();

function validUserPayload(overrides: Partial<any> = {}) {
    return {
        email: `test-${crypto.randomUUID()}@example.com`,
        username: `user_${crypto.randomUUID().slice(0, 8)}`,
        password: "SuperSecret123!",
        role: "USER" as const,
        ...overrides,
    };
}

async function createUser(overrides: Partial<any> = {}) {
    const id = await userService.createUserCore(validUserPayload(overrides), pgDb);
    if (id instanceof ZodError) throw new Error("Fixture setup failed: " + id.message);
    return id;
}

async function createContact(userId: string) {
    const id = await userService.createUserContact(userId, { socials: [] }, pgDb);
    if (id instanceof ZodError) throw new Error("Fixture setup failed: " + id.message);
    return id;
}

describe("UserService.createUserCore", () => {
    test("creates a user and returns its id", async () => {
        const result = await userService.createUserCore(validUserPayload(), pgDb);

        expect(typeof result).toBe("string");
        expect(result).not.toBe("");

        const [row] = await pgDb.select().from(users).where(eq(users.id, result as string));
        expect(row).toBeDefined();
        expect(row?.role).toBe("USER");
        expect(row?.is_verified).toBe(false);
    });

    test("returns a ZodError for an invalid email", async () => {
        const result = await userService.createUserCore(
            validUserPayload({ email: "not-an-email" }),
            pgDb
        );
        expect(result).toBeInstanceOf(ZodError);
    });

    test("rejects a duplicate email", async () => {
        const payload = validUserPayload();
        const first = await userService.createUserCore(payload, pgDb);
        expect(typeof first).toBe("string");

        await expect(
            userService.createUserCore(validUserPayload({ email: payload.email }), pgDb)
        ).rejects.toThrow();
    });
});

describe("UserService.createUserContact / createUserPhone / createUserEmail", () => {
    test("creates a contact for a user", async () => {
        const userId = await createUser();
        const contactId = await userService.createUserContact(userId, { socials: [] }, pgDb);

        expect(typeof contactId).toBe("string");
        expect(contactId).not.toBe("");
    });

    test("creates a phone tied to a contact", async () => {
        const userId = await createUser();
        const contactId = await createContact(userId);

        const phoneId = await userService.createUserPhone(
            userId,
            contactId as string,
            { phone_code: "+1", phone: "5551234567" },
            pgDb
        );

        expect(typeof phoneId).toBe("string");
        expect(phoneId).not.toBe("");
    });

    test("fails to create a phone with an invalid phone_code", async () => {
        const userId = await createUser();
        const contactId = await createContact(userId);

        const result = await userService.createUserPhone(
            userId,
            contactId as string,
            { phone_code: "", phone: "5551234567" },
            pgDb
        );

        expect(result).toBeInstanceOf(ZodError);
    });
});

describe("UserService.updateUserCore", () => {
    test("updates a user's username", async () => {
        const userId = await createUser();
        const newUsername = `updated_${crypto.randomUUID().slice(0, 8)}`;

        const result = await userService.updateUserCore(userId, { username: newUsername }, pgDb);
        expect(result).toBe(userId);

        const [row] = await pgDb.select().from(users).where(eq(users.id, userId));
        expect(row?.username).toBe(newUsername);
    });

    test("returns an empty string when the user doesn't exist", async () => {
        const result = await userService.updateUserCore(
            uuidv4(),
            { username: "ghost" },
            pgDb
        );
        expect(result).toBe("");
    });
});

describe("UserService.deleteUser", () => {
    test("deletes a user and returns the id", async () => {
        const userId = await createUser();

        const result = await userService.deleteUser(userId, pgDb);
        expect(result).toBe(userId);

        const [row] = await pgDb.select().from(users).where(eq(users.id, userId));
        expect(row).toBeUndefined();
    });

    test("returns an empty string when deleting a non-existent user", async () => {
        const result = await userService.deleteUser(crypto.randomUUID(), pgDb);
        expect(result).toBe("");
    });

    test("cascades and deletes the user's contact", async () => {
        const userId = await createUser();
        const contactId = await createContact(userId);

        await userService.deleteUser(userId, pgDb);

        const [row] = await pgDb
            .select()
            .from(userContacts)
            .where(eq(userContacts.id, contactId as string));

        expect(row).toBeUndefined();
    });
});