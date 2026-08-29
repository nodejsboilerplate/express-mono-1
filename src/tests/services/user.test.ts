import { describe, expect, test } from "vitest";
import { pgDb } from "@/libs/db.connect";
import { UserService } from "@/services/user.service";
import {
  usersTable,
  userContactsTable,
  userPhonesTable,
  userEmailsTable,
  userAddressesTable,
  userProfilesTable,
} from "@/database";
import { eq } from "drizzle-orm";
import { Socials } from "@/constants";

const userService = UserService.create()

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
  const id = await userService.createUserCore(
    validUserPayload(overrides),
    pgDb
  );
  if (!id)
    throw new Error(
      "Fixture setup failed: createUserCore returned empty string"
    );
  return id;
}

// createContact has NO id field — user_id required, socials optional
async function createContact(userId: string, overrides: Partial<any> = {}) {
  const id = await userService.createUserContact(
    { user_id: userId, socials: [], ...overrides },
    pgDb
  );
  if (!id)
    throw new Error(
      "Fixture setup failed: createUserContact returned empty string"
    );
  return id;
}

function validAddressPayload(userId: string, overrides: Partial<any> = {}) {
  return {
    user_id: userId,
    addr_name: "Home",
    addr_line_1: "House 12, Road 5",
    city: "Dhaka",
    country: "Bangladesh",
    country_iso: "BD",
    ...overrides,
  };
}

// ---------------------------------------------------------------
// Create
// ---------------------------------------------------------------

describe("User Service Test", { tags: ["services/user"] }, () => {
  describe("UserService.createUserCore", () => {
    test("creates a user and returns its id", async () => {
      const result = await userService.createUserCore(validUserPayload(), pgDb);

      expect(typeof result).toBe("string");
      expect(result).not.toBe("");

      const [row] = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, result));
      expect(row).toBeDefined();
      expect(row?.role).toBe("USER");
      expect(row?.is_verified).toBe(false);
    });

    test("rejects a duplicate email at the database level", async () => {
      const payload = validUserPayload();
      const first = await userService.createUserCore(payload, pgDb);
      expect(typeof first).toBe("string");

      await expect(
        userService.createUserCore(
          validUserPayload({ email: payload.email }),
          pgDb
        )
      ).rejects.toThrow();
    });

    test("rejects a duplicate username at the database level", async () => {
      const payload = validUserPayload();
      const first = await userService.createUserCore(payload, pgDb);
      expect(typeof first).toBe("string");

      await expect(
        userService.createUserCore(
          validUserPayload({ username: payload.username }),
          pgDb
        )
      ).rejects.toThrow();
    });
  });

  describe("UserService.createUserProfile", () => {
    test("creates a profile for a user", async () => {
      const userId = await createUser();

      const profileId = await userService.createUserProfile(
        { user_id: userId, first_name: "Mahin", last_name: "N" },
        pgDb
      );

      expect(typeof profileId).toBe("string");
      expect(profileId).not.toBe("");

      const [row] = await pgDb
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.id, profileId));
      expect(row?.user_id).toBe(userId);
      expect(row?.first_name).toBe("Mahin");
    });

    test("coerces date_of_birth to a date-only string", async () => {
      const userId = await createUser();
      const dob = new Date("1998-04-12T00:00:00.000Z");

      const profileId = await userService.createUserProfile(
        { user_id: userId, first_name: "Mahin", date_of_birth: dob },
        pgDb
      );

      const [row] = await pgDb
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.id, profileId));
      expect(row?.date_of_birth).toBe("1998-04-12");
    });
  });

  describe("UserService.createUserContact / createUserPhone / createUserEmail", () => {
    test("creates a contact for a user with no id supplied", async () => {
      const userId = await createUser();

      // createContact schema takes no `id` — it's DB-generated
      const contactId = await userService.createUserContact(
        { user_id: userId, socials: [] },
        pgDb
      );

      expect(typeof contactId).toBe("string");
      expect(contactId).not.toBe("");

      const [row] = await pgDb
        .select()
        .from(userContactsTable)
        .where(eq(userContactsTable.id, contactId));
      expect(row?.user_id).toBe(userId);
    });

    test("creates a phone tied to a contact", async () => {
      const userId = await createUser();
      const contactId = await createContact(userId);

      const phoneId = await userService.createUserPhone(
        {
          user_id: userId,
          contact_id: contactId,
          phone_code: "+1",
          phone: "5551234567",
        },
        pgDb
      );

      expect(typeof phoneId).toBe("string");
      expect(phoneId).not.toBe("");

      const [row] = await pgDb
        .select()
        .from(userPhonesTable)
        .where(eq(userPhonesTable.id, phoneId));
      expect(row?.user_id).toBe(userId);
      expect(row?.contact_id).toBe(contactId);
    });

    test("creates an email tied to a contact", async () => {
      const userId = await createUser();
      const contactId = await createContact(userId);

      const emailId = await userService.createUserEmail(
        {
          user_id: userId,
          contact_id: contactId,
          email: `contact-${crypto.randomUUID()}@example.com`,
        },
        pgDb
      );

      expect(typeof emailId).toBe("string");
      expect(emailId).not.toBe("");
    });

    test("throws when phone_code is missing (DB NOT NULL, no service-level validation)", async () => {
      const userId = await createUser();
      const contactId = await createContact(userId);

      await expect(
        userService.createUserPhone(
          {
            user_id: userId,
            contact_id: contactId,
            phone: "5551234567",
          } as any,
          pgDb
        )
      ).rejects.toThrow();
    });
  });

  describe("UserService.createUserAddress", () => {
    test("creates an address for a user", async () => {
      const userId = await createUser();

      const addressId = await userService.createUserAddress(
        validAddressPayload(userId),
        pgDb
      );

      expect(typeof addressId).toBe("string");
      expect(addressId).not.toBe("");

      const [row] = await pgDb
        .select()
        .from(userAddressesTable)
        .where(eq(userAddressesTable.id, addressId));
      expect(row?.user_id).toBe(userId);
      expect(row?.city).toBe("Dhaka");
    });
  });

  // ---------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------

  describe("UserService.updateUserCore", () => {
    test("updates a user's username", async () => {
      const userId = await createUser();
      const newUsername = `updated_${crypto.randomUUID().slice(0, 8)}`;

      const result = await userService.updateUserCore(
        { id: userId, username: newUsername },
        pgDb
      );
      expect(result).toBe(userId);

      const [row] = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));
      expect(row?.username).toBe(newUsername);
    });

    test("returns an empty string when the user doesn't exist", async () => {
      const result = await userService.updateUserCore(
        { id: crypto.randomUUID(), username: "ghost" },
        pgDb
      );
      expect(result).toBe("");
    });
  });

  describe("UserService.updateUserProfile", () => {
    // updateProfile requires BOTH id and user_id
    test("updates a profile's first_name", async () => {
      const userId = await createUser();
      const profileId = await userService.createUserProfile(
        { user_id: userId, first_name: "Old" },
        pgDb
      );

      const result = await userService.updateUserProfile(
        { id: profileId, user_id: userId, first_name: "New" },
        pgDb
      );
      expect(result).toBe(profileId);

      const [row] = await pgDb
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.id, profileId));
      expect(row?.first_name).toBe("New");
    });

    test("returns an empty string when no profile row exists", async () => {
      const userId = await createUser(); // no profile created

      const result = await userService.updateUserProfile(
        { id: crypto.randomUUID(), user_id: userId, first_name: "New" },
        pgDb
      );
      expect(result).toBe("");
    });
  });

  describe("UserService.updateUserPhone / updateUserEmail / updateUserAddress", () => {
    test("updates a phone scoped to its user", async () => {
      const userId = await createUser();
      const contactId = await createContact(userId);
      const phoneId = await userService.createUserPhone(
        {
          user_id: userId,
          contact_id: contactId,
          phone_code: "+1",
          phone: "5551234567",
        },
        pgDb
      );

      const result = await userService.updateUserPhone(
        { id: phoneId, user_id: userId, phone: "5559999999" },
        pgDb
      );
      expect(result).toBe(phoneId);

      const [row] = await pgDb
        .select()
        .from(userPhonesTable)
        .where(eq(userPhonesTable.id, phoneId));
      expect(row?.phone).toBe("5559999999");
    });

    test("returns an empty string when the phone belongs to a different user", async () => {
      const userId = await createUser();
      const otherUserId = await createUser();
      const contactId = await createContact(userId);
      const phoneId = await userService.createUserPhone(
        {
          user_id: userId,
          contact_id: contactId,
          phone_code: "+1",
          phone: "5551234567",
        },
        pgDb
      );

      const result = await userService.updateUserPhone(
        { id: phoneId, user_id: otherUserId, phone: "5559999999" },
        pgDb
      );
      expect(result).toBe("");
    });

    test("updates an email scoped to its user", async () => {
      const userId = await createUser();
      const contactId = await createContact(userId);
      const emailId = await userService.createUserEmail(
        {
          user_id: userId,
          contact_id: contactId,
          email: `old-${crypto.randomUUID()}@example.com`,
        },
        pgDb
      );

      const newEmail = `new-${crypto.randomUUID()}@example.com`;
      const result = await userService.updateUserEmail(
        { id: emailId, user_id: userId, email: newEmail },
        pgDb
      );
      expect(result).toBe(emailId);

      const [row] = await pgDb
        .select()
        .from(userEmailsTable)
        .where(eq(userEmailsTable.id, emailId));
      expect(row?.email).toBe(newEmail);
    });

    test("updates an address scoped to its user", async () => {
      const userId = await createUser();
      const addressId = await userService.createUserAddress(
        validAddressPayload(userId),
        pgDb
      );

      const result = await userService.updateUserAddress(
        { id: addressId, user_id: userId, city: "Chattogram" },
        pgDb
      );
      expect(result).toBe(addressId);

      const [row] = await pgDb
        .select()
        .from(userAddressesTable)
        .where(eq(userAddressesTable.id, addressId));
      expect(row?.city).toBe("Chattogram");
    });
  });

  describe("UserService.updateUserContact", () => {
    // updateContact only requires user_id — no id field exists on this schema at all
    test("updates a contact's socials", async () => {
      const userId = await createUser();
      await createContact(userId);

      const result = await userService.updateUserContact(
        {
          user_id: userId,
          socials: [
            { type: Socials.FACEBOOK, url: "https://facebook.com/mahin" },
          ],
        },
        pgDb
      );
      expect(result).not.toBe("");

      const [row] = await pgDb
        .select()
        .from(userContactsTable)
        .where(eq(userContactsTable.user_id, userId));
      expect(row?.socials).toEqual([
        { type: "facebook", url: "https://facebook.com/mahin" },
      ]);
    });

    test("returns an empty string when no contact row exists", async () => {
      const userId = await createUser(); // no contact created

      const result = await userService.updateUserContact(
        { user_id: userId, socials: [] },
        pgDb
      );
      expect(result).toBe("");
    });
  });

  // ---------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------

  describe("UserService.deleteUserContact / deleteUserPhone / deleteUserEmail / deleteUserAddress", () => {
    test("deletes a contact scoped to its user", async () => {
      const userId = await createUser();
      const contactId = await createContact(userId);

      const result = await userService.deleteUserContact(
        { id: contactId, user_id: userId },
        pgDb
      );
      expect(result).toBe(contactId);

      const rows = await pgDb
        .select()
        .from(userContactsTable)
        .where(eq(userContactsTable.id, contactId));
      expect(rows).toHaveLength(0);
    });

    test("returns an empty string when deleting a contact belonging to another user", async () => {
      const userId = await createUser();
      const otherUserId = await createUser();
      const contactId = await createContact(userId);

      const result = await userService.deleteUserContact(
        { id: contactId, user_id: otherUserId },
        pgDb
      );
      expect(result).toBe("");

      const rows = await pgDb
        .select()
        .from(userContactsTable)
        .where(eq(userContactsTable.id, contactId));
      expect(rows).toHaveLength(1);
    });

    test("deletes a phone scoped to its user", async () => {
      const userId = await createUser();
      const contactId = await createContact(userId);
      const phoneId = await userService.createUserPhone(
        {
          user_id: userId,
          contact_id: contactId,
          phone_code: "+1",
          phone: "5551234567",
        },
        pgDb
      );

      const result = await userService.deleteUserPhone(
        { id: phoneId, user_id: userId },
        pgDb
      );
      expect(result).toBe(phoneId);
    });

    test("deletes an email scoped to its user", async () => {
      const userId = await createUser();
      const contactId = await createContact(userId);
      const emailId = await userService.createUserEmail(
        {
          user_id: userId,
          contact_id: contactId,
          email: `contact-${crypto.randomUUID()}@example.com`,
        },
        pgDb
      );

      const result = await userService.deleteUserEmail(
        { id: emailId, user_id: userId },
        pgDb
      );
      expect(result).toBe(emailId);
    });

    test("deletes an address scoped to its user", async () => {
      const userId = await createUser();
      const addressId = await userService.createUserAddress(
        validAddressPayload(userId),
        pgDb
      );

      const result = await userService.deleteUserAddress(
        { id: addressId, user_id: userId },
        pgDb
      );
      expect(result).toBe(addressId);
    });
  });

  describe("UserService.deleteUser", () => {
    test("deletes a user and returns the id", async () => {
      const userId = await createUser();

      const result = await userService.deleteUser(userId, pgDb);
      expect(result).toBe(userId);

      const [row] = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));
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

      const rows = await pgDb
        .select()
        .from(userContactsTable)
        .where(eq(userContactsTable.id, contactId));
      expect(rows).toHaveLength(0);
    });

    test("cascades and deletes the user's profile, phone, and address", async () => {
      const userId = await createUser();
      await userService.createUserProfile(
        { user_id: userId, first_name: "Mahin" },
        pgDb
      );
      const contactId = await createContact(userId);
      const phoneId = await userService.createUserPhone(
        {
          user_id: userId,
          contact_id: contactId,
          phone_code: "+1",
          phone: "5551234567",
        },
        pgDb
      );
      const addressId = await userService.createUserAddress(
        validAddressPayload(userId),
        pgDb
      );

      await userService.deleteUser(userId, pgDb);

      const [profileRow] = await pgDb
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.user_id, userId));
      const [phoneRow] = await pgDb
        .select()
        .from(userPhonesTable)
        .where(eq(userPhonesTable.id, phoneId));
      const [addressRow] = await pgDb
        .select()
        .from(userAddressesTable)
        .where(eq(userAddressesTable.id, addressId));

      expect(profileRow).toBeUndefined();
      expect(phoneRow).toBeUndefined();
      expect(addressRow).toBeUndefined();
    });
  });
});
