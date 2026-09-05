import { describe, expect, test } from "vitest";
import { pgDb } from "@/libs/db.connect";
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
import { EmailService, UserService } from "@/services";

const userService = new UserService();
const emailService = new EmailService();

function validUserWithProfilePayload(
  overrides: { user?: Partial<any>; profile?: Partial<any> } = {}
) {
  return {
    user: {
      email: `test-${crypto.randomUUID()}@example.com`,
      username: `user_${crypto.randomUUID().slice(0, 8)}`,
      password: "SuperSecret123!",
      role: "USER" as const,
      ...overrides.user,
    },
    profile: {
      first_name: "Mahin",
      ...overrides.profile,
    },
  };
}

async function createUser(
  overrides: { user?: Partial<any>; profile?: Partial<any> } = {}
) {
  const { user, profile } = await userService.createUserWithProfile(
    validUserWithProfilePayload(overrides)
  );
  const profileId = profile.id;
  const userId = user.id;
  if (!userId) throw new Error("Fixture setup failed: no userId returned");
  return { userId, profileId };
}

async function createContact(userId: string, overrides: Partial<any> = {}) {
  const id = await userService.createUserContact({
    user_id: userId,
    socials: [],
    ...overrides,
  });
  if (!id) throw new Error("Fixture setup failed: no contactId returned");
  return id;
}

async function createPhone(
  userId: string,
  contactId: string,
  overrides: Partial<any> = {}
) {
  const id = await userService.createUserPhone({
    user_id: userId,
    contact_id: contactId,
    phone_code: "+1",
    phone: `555${Math.floor(1000000 + Math.random() * 8999999)}`,
    ...overrides,
  });
  if (!id) throw new Error("Fixture setup failed: no phoneId returned");
  return id;
}

async function createEmail(
  userId: string,
  contactId: string,
  overrides: Partial<any> = {}
) {
  const id = await userService.createUserEmail({
    user_id: userId,
    contact_id: contactId,
    email: `contact-${crypto.randomUUID()}@example.com`,
    ...overrides,
  });
  if (!id) throw new Error("Fixture setup failed: no emailId returned");
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

describe("User Service Test", { tags: ["services/user"] }, () => {
  // ---------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------

  describe("UserService.createUserWithProfile", () => {
    test("creates a user + profile and returns both ids", async () => {
      const { user, profile } = await userService.createUserWithProfile(
        validUserWithProfilePayload()
      );
      const profileId = profile.id;
      const userId = user.id;
      expect(typeof userId).toBe("string");
      expect(typeof profileId).toBe("string");

      const [userRow] = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));
      expect(userRow?.role).toBe("USER");
      expect(userRow?.is_verified).toBe(false);

      const [profileRow] = await pgDb
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.id, profileId));
      expect(profileRow?.user_id).toBe(userId);
      expect(profileRow?.first_name).toBe("Mahin");
    });

    test("coerces date_of_birth to a date-only string", async () => {
      const dob = new Date("1998-04-12T00:00:00.000Z");
      const { profile } = await userService.createUserWithProfile(
        validUserWithProfilePayload({
          profile: { first_name: "Mahin", date_of_birth: dob },
        })
      );
      const profileId = profile.id;

      const [row] = await pgDb
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.id, profileId));
      expect(row?.date_of_birth).toBe("1998-04-12");
    });

    test("rejects a duplicate email at the database level", async () => {
      const payload = validUserWithProfilePayload();
      await userService.createUserWithProfile(payload);

      await expect(
        userService.createUserWithProfile(
          validUserWithProfilePayload({ user: { email: payload.user.email } })
        )
      ).rejects.toThrow();
    });

    test("rejects a duplicate username at the database level", async () => {
      const payload = validUserWithProfilePayload();
      await userService.createUserWithProfile(payload);

      await expect(
        userService.createUserWithProfile(
          validUserWithProfilePayload({
            user: { username: payload.user.username },
          })
        )
      ).rejects.toThrow();
    });
  });

  describe("UserService.createUserContact / createUserPhone / createUserEmail", () => {
    test("creates a contact for a user with no id supplied", async () => {
      const { userId } = await createUser();

      const contactId = await userService.createUserContact({
        user_id: userId,
        socials: [],
      });

      expect(typeof contactId).toBe("string");

      const [row] = await pgDb
        .select()
        .from(userContactsTable)
        .where(eq(userContactsTable.id, contactId));
      expect(row?.user_id).toBe(userId);
    });

    test("creates a phone tied to a contact", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);

      const phoneId = await userService.createUserPhone({
        user_id: userId,
        contact_id: contactId,
        phone_code: "+1",
        phone: "5551234567",
      });

      expect(typeof phoneId).toBe("string");

      const [row] = await pgDb
        .select()
        .from(userPhonesTable)
        .where(eq(userPhonesTable.id, phoneId));
      expect(row?.user_id).toBe(userId);
      expect(row?.contact_id).toBe(contactId);
    });

    test("creates an email tied to a contact", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);

      const emailId = await userService.createUserEmail({
        user_id: userId,
        contact_id: contactId,
        email: `contact-${crypto.randomUUID()}@example.com`,
      });

      expect(typeof emailId).toBe("string");
    });

    test("throws when phone_code is missing (DB NOT NULL, no service-level validation)", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);

      await expect(
        userService.createUserPhone({
          user_id: userId,
          contact_id: contactId,
          phone: "5551234567",
        } as any)
      ).rejects.toThrow();
    });
  });

  describe("UserService.createUserAddress", () => {
    test("creates an address for a user", async () => {
      const { userId } = await createUser();

      const addressId = await userService.createUserAddress(
        validAddressPayload(userId)
      );

      expect(typeof addressId).toBe("string");

      const [row] = await pgDb
        .select()
        .from(userAddressesTable)
        .where(eq(userAddressesTable.id, addressId));
      expect(row?.user_id).toBe(userId);
      expect(row?.city).toBe("Dhaka");
    });
  });

  // ---------------------------------------------------------------
  // Send Verification Code
  // ---------------------------------------------------------------

  describe("UserService.sendVerificationCodeForPhone", () => {
    test("sets a verification code on an unverified phone and returns its id", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);
      const phoneId = await createPhone(userId, contactId);

      const result = await userService.sendVerificationCodeForPhone({
        id: phoneId,
        user_id: userId,
      });
      expect(result).toBe(phoneId);

      const [row] = await pgDb
        .select()
        .from(userPhonesTable)
        .where(eq(userPhonesTable.id, phoneId));
      expect(row?.verify_code).toBeTruthy();
      expect(row?.verify_expiry).toBeTruthy();
    });

    test("throws when the phone is already verified", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);
      const phoneId = await createPhone(userId, contactId);

      await pgDb
        .update(userPhonesTable)
        .set({ is_verified: true })
        .where(eq(userPhonesTable.id, phoneId));

      await expect(
        userService.sendVerificationCodeForPhone({
          id: phoneId,
          user_id: userId,
        })
      ).rejects.toThrow();
    });

    test("throws when the phone belongs to a different user", async () => {
      const { userId } = await createUser();
      const { userId: otherUserId } = await createUser();
      const contactId = await createContact(userId);
      const phoneId = await createPhone(userId, contactId);

      await expect(
        userService.sendVerificationCodeForPhone({
          id: phoneId,
          user_id: otherUserId,
        })
      ).rejects.toThrow();
    });

    test("throws when the phone does not exist", async () => {
      const { userId } = await createUser();

      await expect(
        userService.sendVerificationCodeForPhone({
          id: crypto.randomUUID(),
          user_id: userId,
        })
      ).rejects.toThrow();
    });
  });

  describe("EmailService.sendVerifyContactEmailCode", () => {
    test("sets a verification code on an unverified email and returns its id", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);
      const emailId = await createEmail(userId, contactId);

      const result = await emailService.sendVerifyContactEmailCode(
        { id: emailId, user_id: userId },
        "test device"
      );
      expect(result).toBe(emailId);

      const [row] = await pgDb
        .select()
        .from(userEmailsTable)
        .where(eq(userEmailsTable.id, emailId));
      expect(row?.verify_code).toBeTruthy();
      expect(row?.verify_expiry).toBeTruthy();
    });

    test("throws when the email is already verified", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);
      const emailId = await createEmail(userId, contactId);

      await pgDb
        .update(userEmailsTable)
        .set({ is_verified: true })
        .where(eq(userEmailsTable.id, emailId));

      await expect(
        emailService.sendVerifyContactEmailCode(
          { id: emailId, user_id: userId },
          "test device"
        )
      ).rejects.toThrow();
    });

    test("throws when the email belongs to a different user", async () => {
      const { userId } = await createUser();
      const { userId: otherUserId } = await createUser();
      const contactId = await createContact(userId);
      const emailId = await createEmail(userId, contactId);

      await expect(
        emailService.sendVerifyContactEmailCode(
          { id: emailId, user_id: otherUserId },
          "test device"
        )
      ).rejects.toThrow();
    });

    test("throws when the email does not exist", async () => {
      const { userId } = await createUser();

      await expect(
        emailService.sendVerifyContactEmailCode(
          { id: crypto.randomUUID(), user_id: userId },
          "test device"
        )
      ).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------

  describe("UserService.updateUserProfile", () => {
    test("updates a profile's first_name", async () => {
      const { userId, profileId } = await createUser();

      const result = await userService.updateUserProfile({
        id: profileId,
        user_id: userId,
        first_name: "New",
      });
      expect(result).toBe(profileId);

      const [row] = await pgDb
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.id, profileId));
      expect(row?.first_name).toBe("New");
    });

    test("throws when no profile row exists for that user_id/id combo", async () => {
      const { userId } = await createUser();

      await expect(
        userService.updateUserProfile({
          id: crypto.randomUUID(),
          user_id: userId,
          first_name: "New",
        })
      ).rejects.toThrow();
    });
  });

  describe("UserService.updateUserPhone / updateUserEmail / updateUserAddress", () => {
    test("updates a phone scoped to its user", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);
      const phoneId = await userService.createUserPhone({
        user_id: userId,
        contact_id: contactId,
        phone_code: "+1",
        phone: "5551234567",
      });

      const result = await userService.updateUserPhone({
        id: phoneId,
        user_id: userId,
        phone: "5559999999",
      });
      expect(result).toBe(phoneId);

      const [row] = await pgDb
        .select()
        .from(userPhonesTable)
        .where(eq(userPhonesTable.id, phoneId));
      expect(row?.phone).toBe("5559999999");
    });

    test("throws when the phone belongs to a different user", async () => {
      const { userId } = await createUser();
      const { userId: otherUserId } = await createUser();
      const contactId = await createContact(userId);
      const phoneId = await userService.createUserPhone({
        user_id: userId,
        contact_id: contactId,
        phone_code: "+1",
        phone: "5551234567",
      });

      await expect(
        userService.updateUserPhone({
          id: phoneId,
          user_id: otherUserId,
          phone: "5559999999",
        })
      ).rejects.toThrow();
    });

    test("updates an email scoped to its user", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);
      const emailId = await userService.createUserEmail({
        user_id: userId,
        contact_id: contactId,
        email: `old-${crypto.randomUUID()}@example.com`,
      });

      const newEmail = `new-${crypto.randomUUID()}@example.com`;
      const result = await userService.updateUserEmail({
        id: emailId,
        user_id: userId,
        email: newEmail,
      });
      expect(result).toBe(emailId);

      const [row] = await pgDb
        .select()
        .from(userEmailsTable)
        .where(eq(userEmailsTable.id, emailId));
      expect(row?.email).toBe(newEmail);
    });

    test("updates an address scoped to its user", async () => {
      const { userId } = await createUser();
      const addressId = await userService.createUserAddress(
        validAddressPayload(userId)
      );

      const result = await userService.updateUserAddress({
        id: addressId,
        user_id: userId,
        city: "Chattogram",
      });
      expect(result).toBe(addressId);

      const [row] = await pgDb
        .select()
        .from(userAddressesTable)
        .where(eq(userAddressesTable.id, addressId));
      expect(row?.city).toBe("Chattogram");
    });
  });

  describe("UserService.updateUserContact", () => {
    test("updates a contact's socials", async () => {
      const { userId } = await createUser();
      await createContact(userId);

      const result = await userService.updateUserContact({
        user_id: userId,
        socials: [
          { type: Socials.FACEBOOK, url: "https://facebook.com/mahin" },
        ],
      });
      expect(typeof result).toBe("string");

      const [row] = await pgDb
        .select()
        .from(userContactsTable)
        .where(eq(userContactsTable.user_id, userId));
      expect(row?.socials).toEqual([
        { type: "facebook", url: "https://facebook.com/mahin" },
      ]);
    });

    test("throws when no contact row exists", async () => {
      const { userId } = await createUser();

      await expect(
        userService.updateUserContact({ user_id: userId, socials: [] })
      ).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------
  // Verifications
  // ---------------------------------------------------------------

  describe("UserService.verifyContactPhone", () => {
    test("verifies a phone with a correct, unexpired code", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);
      const phoneId = await createPhone(userId, contactId);
      await userService.sendVerificationCodeForPhone({
        id: phoneId,
        user_id: userId,
      });

      const [row] = await pgDb
        .select()
        .from(userPhonesTable)
        .where(eq(userPhonesTable.id, phoneId));

      const result = await userService.verifyContactPhone({
        id: phoneId,
        user_id: userId,
        verify_code: row!.verify_code!,
      });
      expect(result).toBe(phoneId);

      const [updated] = await pgDb
        .select()
        .from(userPhonesTable)
        .where(eq(userPhonesTable.id, phoneId));
      expect(updated?.is_verified).toBe(true);
      expect(updated?.verify_code).toBeNull();
      expect(updated?.verify_expiry).toBeNull();
    });

    test("throws when the phone is already verified", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);
      const phoneId = await createPhone(userId, contactId);
      await userService.sendVerificationCodeForPhone({
        id: phoneId,
        user_id: userId,
      });
      const [row] = await pgDb
        .select()
        .from(userPhonesTable)
        .where(eq(userPhonesTable.id, phoneId));

      await userService.verifyContactPhone({
        id: phoneId,
        user_id: userId,
        verify_code: row!.verify_code!,
      });

      await expect(
        userService.verifyContactPhone({
          id: phoneId,
          user_id: userId,
          verify_code: row!.verify_code!,
        })
      ).rejects.toThrow();
    });

    test("throws when the code is incorrect", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);
      const phoneId = await createPhone(userId, contactId);
      await userService.sendVerificationCodeForPhone({
        id: phoneId,
        user_id: userId,
      });

      await expect(
        userService.verifyContactPhone({
          id: phoneId,
          user_id: userId,
          verify_code: "000000",
        })
      ).rejects.toThrow();
    });

    test("throws when the code has expired", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);
      const phoneId = await createPhone(userId, contactId);
      await userService.sendVerificationCodeForPhone({
        id: phoneId,
        user_id: userId,
      });
      const [row] = await pgDb
        .select()
        .from(userPhonesTable)
        .where(eq(userPhonesTable.id, phoneId));

      await pgDb
        .update(userPhonesTable)
        .set({ verify_expiry: new Date(Date.now() - 60_000) })
        .where(eq(userPhonesTable.id, phoneId));

      await expect(
        userService.verifyContactPhone({
          id: phoneId,
          user_id: userId,
          verify_code: row!.verify_code!,
        })
      ).rejects.toThrow();
    });

    test("throws when the phone does not exist", async () => {
      const { userId } = await createUser();

      await expect(
        userService.verifyContactPhone({
          id: crypto.randomUUID(),
          user_id: userId,
          verify_code: "123456",
        })
      ).rejects.toThrow();
    });
  });

  describe("UserService.verifyContactEmail", () => {
    test("verifies an email with a correct, unexpired code", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);
      const emailId = await createEmail(userId, contactId);
      await emailService.sendVerifyContactEmailCode(
        { id: emailId, user_id: userId },
        "test device"
      );

      const [row] = await pgDb
        .select()
        .from(userEmailsTable)
        .where(eq(userEmailsTable.id, emailId));

      const result = await userService.verifyContactEmail({
        id: emailId,
        user_id: userId,
        verify_code: row!.verify_code!,
      });
      expect(result).toBe(emailId);

      const [updated] = await pgDb
        .select()
        .from(userEmailsTable)
        .where(eq(userEmailsTable.id, emailId));
      expect(updated?.is_verified).toBe(true);
      expect(updated?.verify_code).toBeNull();
      expect(updated?.verify_expiry).toBeNull();
    });

    test("throws when the email is already verified", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);
      const emailId = await createEmail(userId, contactId);
      await emailService.sendVerifyContactEmailCode(
        { id: emailId, user_id: userId },
        "test device"
      );
      const [row] = await pgDb
        .select()
        .from(userEmailsTable)
        .where(eq(userEmailsTable.id, emailId));

      await userService.verifyContactEmail({
        id: emailId,
        user_id: userId,
        verify_code: row!.verify_code!,
      });

      await expect(
        userService.verifyContactEmail({
          id: emailId,
          user_id: userId,
          verify_code: row!.verify_code!,
        })
      ).rejects.toThrow();
    });

    test("throws when the code is incorrect", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);
      const emailId = await createEmail(userId, contactId);
      await emailService.sendVerifyContactEmailCode(
        { id: emailId, user_id: userId },
        "test device"
      );

      await expect(
        userService.verifyContactEmail({
          id: emailId,
          user_id: userId,
          verify_code: "000000",
        })
      ).rejects.toThrow();
    });

    test("throws when the code has expired", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);
      const emailId = await createEmail(userId, contactId);
      await emailService.sendVerifyContactEmailCode(
        { id: emailId, user_id: userId },
        "test device"
      );
      const [row] = await pgDb
        .select()
        .from(userEmailsTable)
        .where(eq(userEmailsTable.id, emailId));

      await pgDb
        .update(userEmailsTable)
        .set({ verify_expiry: new Date(Date.now() - 60_000) })
        .where(eq(userEmailsTable.id, emailId));

      await expect(
        userService.verifyContactEmail({
          id: emailId,
          user_id: userId,
          verify_code: row!.verify_code!,
        })
      ).rejects.toThrow();
    });

    test("throws when the email does not exist", async () => {
      const { userId } = await createUser();

      await expect(
        userService.verifyContactEmail({
          id: crypto.randomUUID(),
          user_id: userId,
          verify_code: "123456",
        })
      ).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------

  describe("UserService.deleteUserContact / deleteUserPhone / deleteUserEmail / deleteUserAddress", () => {
    test("deletes a contact scoped to its user", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);

      const result = await userService.deleteUserContact({
        id: contactId,
        user_id: userId,
      });
      expect(result).toBe(contactId);

      const rows = await pgDb
        .select()
        .from(userContactsTable)
        .where(eq(userContactsTable.id, contactId));
      expect(rows).toHaveLength(0);
    });

    test("throws when deleting a contact belonging to another user", async () => {
      const { userId } = await createUser();
      const { userId: otherUserId } = await createUser();
      const contactId = await createContact(userId);

      await expect(
        userService.deleteUserContact({ id: contactId, user_id: otherUserId })
      ).rejects.toThrow();

      const rows = await pgDb
        .select()
        .from(userContactsTable)
        .where(eq(userContactsTable.id, contactId));
      expect(rows).toHaveLength(1);
    });

    test("deletes a phone scoped to its user", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);
      const phoneId = await userService.createUserPhone({
        user_id: userId,
        contact_id: contactId,
        phone_code: "+1",
        phone: "5551234567",
      });

      const result = await userService.deleteUserPhone({
        id: phoneId,
        user_id: userId,
      });
      expect(result).toBe(phoneId);
    });

    test("deletes an email scoped to its user", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);
      const emailId = await userService.createUserEmail({
        user_id: userId,
        contact_id: contactId,
        email: `contact-${crypto.randomUUID()}@example.com`,
      });

      const result = await userService.deleteUserEmail({
        id: emailId,
        user_id: userId,
      });
      expect(result).toBe(emailId);
    });

    test("deletes an address scoped to its user", async () => {
      const { userId } = await createUser();
      const addressId = await userService.createUserAddress(
        validAddressPayload(userId)
      );

      const result = await userService.deleteUserAddress({
        id: addressId,
        user_id: userId,
      });
      expect(result).toBe(addressId);
    });
  });

  describe("UserService.deleteUser", () => {
    test("deletes a user and returns the id", async () => {
      const { userId } = await createUser();

      const result = await userService.deleteUser(userId);
      expect(result).toBe(userId);

      const [row] = await pgDb
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId));
      expect(row).toBeUndefined();
    });

    test("throws when deleting a non-existent user", async () => {
      await expect(
        userService.deleteUser(crypto.randomUUID())
      ).rejects.toThrow();
    });

    test("cascades and deletes the user's contact", async () => {
      const { userId } = await createUser();
      const contactId = await createContact(userId);

      await userService.deleteUser(userId);

      const rows = await pgDb
        .select()
        .from(userContactsTable)
        .where(eq(userContactsTable.id, contactId));
      expect(rows).toHaveLength(0);
    });

    test("cascades and deletes the user's profile, phone, and address", async () => {
      const { userId, profileId } = await createUser();
      const contactId = await createContact(userId);
      const phoneId = await userService.createUserPhone({
        user_id: userId,
        contact_id: contactId,
        phone_code: "+1",
        phone: "5551234567",
      });
      const addressId = await userService.createUserAddress(
        validAddressPayload(userId)
      );

      await userService.deleteUser(userId);

      const [profileRow] = await pgDb
        .select()
        .from(userProfilesTable)
        .where(eq(userProfilesTable.id, profileId));
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
