import {
  userAddresses,
  userContacts,
  userEmails,
  userPhones,
  userProfiles,
  users,
} from "@/database";
import type {
  UserAddressInsertType,
  UserAddressSelectType,
  UserContactInsertType,
  UserEmailsInsertType,
  UserEmailsSelectType,
  UserInsertType,
  UserPhonesInsertType,
  UserPhonesSelectType,
  UserProfileInsertType,
  UserSelectType,
} from "@/database/type";
import { pgDb } from "@/libs/db.connect";
import { validateWithZod } from "@/utils";
import {
  UserZValidation,
  type CreateUserAddressInput,
  type CreateUserContactInput,
  type CreateUserCoreInput,
  type CreateUserEmailInput,
  type CreateUserPhoneInput,
  type CreateUserProfileInput,
} from "@/zod";
import { eq } from "drizzle-orm";
import type z from "zod";

interface UserServiceType {
  // =========================================================
  // Create
  // =========================================================
  createUserCore(
    payload: CreateUserCoreInput,
    db: typeof pgDb
  ): Promise<string | z.ZodError>;
  createUserProfile(
    userId: string,
    payload: CreateUserProfileInput,
    db: typeof pgDb
  ): Promise<string | z.ZodError>;
  createUserContact(
    userId: string,
    payload: CreateUserContactInput,
    db: typeof pgDb
  ): Promise<string | z.ZodError>;
  createUserPhone(
    contactId: string,
    payload: CreateUserPhoneInput,
    db: typeof pgDb
  ): Promise<string | z.ZodError>;
  createUserEmail(
    contactId: string,
    payload: CreateUserEmailInput,
    db: typeof pgDb
  ): Promise<string | z.ZodError>;
  createUserAddress(
    userId: string,
    payload: CreateUserAddressInput,
    db: typeof pgDb
  ): Promise<string | z.ZodError>;

  // =========================================================
  // Update
  // =========================================================
  updateUserCore(
    data: UserInsertType,
    db: typeof pgDb
  ): Promise<string | z.ZodError>;
  updateUserProfile(
    data: UserProfileInsertType,
    db: typeof pgDb
  ): Promise<string | z.ZodError>;
  updateUserPhone(
    data: UserPhonesInsertType,
    db: typeof pgDb
  ): Promise<string | z.ZodError>;
  updateUserEmail(
    data: UserEmailsInsertType,
    db: typeof pgDb
  ): Promise<string | z.ZodError>;
  updateUserAddress(
    data: UserAddressInsertType,
    db: typeof pgDb
  ): Promise<string | z.ZodError>;
  updateUserContact(
    data: UserContactInsertType,
    db: typeof pgDb
  ): Promise<string | z.ZodError>;

  // =========================================================
  // Delete
  // =========================================================
  deleteUserContact(
    id: Pick<UserContactInsertType, "id">,
    db: typeof pgDb
  ): Promise<string | z.ZodError>;
  deleteUserPhone(
    id: Pick<UserPhonesSelectType, "id">,
    db: typeof pgDb
  ): Promise<string | z.ZodError>;
  deleteUserEmail(
    id: Pick<UserEmailsSelectType, "id">,
    db: typeof pgDb
  ): Promise<string | z.ZodError>;
  deleteUserAddress(
    id: Pick<UserAddressSelectType, "id">,
    db: typeof pgDb
  ): Promise<string | z.ZodError>;
  deleteUser(
    id: Pick<UserSelectType, "id">,
    db: typeof pgDb
  ): Promise<string | z.ZodError>;
}

export class UserService implements UserServiceType {
  // ---------------------------------------------------------
  // Create
  // ---------------------------------------------------------
  async createUserCore(
    payload: CreateUserCoreInput,
    db: typeof pgDb
  ): Promise<string | z.ZodError> {
    const { data, success, error } = validateWithZod(
      payload,
      UserZValidation.user
    );

    if (!success) return error;

    const [user] = await db
      .insert(users)
      .values(data)
      .returning({ id: users.id });

    if (!user?.id) return "";

    return user?.id;
  }

  async createUserAddress(
    userId: string,
    payload: CreateUserAddressInput,
    db: typeof pgDb
  ): Promise<string | z.ZodError> {
    const { data, success, error } = validateWithZod(
      payload,
      UserZValidation.address
    );

    if (!success) {
      return error;
    }

    const [createdUserAddress] = await db
      .insert(userAddresses)
      .values({ ...data, user_id: userId })
      .returning({ id: userAddresses.id });

    if (!createdUserAddress?.id) return "";
    return createdUserAddress?.id;
  }

  async createUserContact(
    userId: string,
    payload: CreateUserContactInput,
    db: typeof pgDb
  ): Promise<string | z.ZodError> {
    const { data, success, error } = validateWithZod(
      payload,
      UserZValidation.contact
    );
    if (!success) {
      return error;
    }

    const [createdUserContact] = await db
      .insert(userContacts)
      .values({ ...data, user_id: userId })
      .returning({ id: userContacts.id });

    if (!createdUserContact?.id) return "";
    return createdUserContact?.id;
  }

  async createUserEmail(
    contactId: string,
    payload: CreateUserEmailInput,
    db: typeof pgDb
  ): Promise<string | z.ZodError> {
    const { data, success, error } = validateWithZod(
      payload,
      UserZValidation.email
    );
    if (!success) {
      return error;
    }

    const [createdUserEmail] = await db
      .insert(userEmails)
      .values({ ...data, contact_id: contactId })
      .returning({ id: userEmails.id });

    if (!createdUserEmail?.id) return "";

    return createdUserEmail.id;
  }

  async createUserPhone(
    contactId: string,
    payload: CreateUserPhoneInput,
    db: typeof pgDb
  ): Promise<string | z.ZodError> {
    const { data, success, error } = validateWithZod(
      payload,
      UserZValidation.phone
    );
    if (!success) {
      return error;
    }

    const [createdUserPhone] = await db
      .insert(userPhones)
      .values({ ...data, contact_id: contactId })
      .returning({ id: userPhones.id });
    if (!createdUserPhone?.id) return "";

    return createdUserPhone.id;
  }

  async createUserProfile(
    userId: string,
    payload: CreateUserProfileInput,
    db: typeof pgDb
  ): Promise<string | z.ZodError> {
    const { data, success, error } = validateWithZod(
      payload,
      UserZValidation.profile
    );
    if (!success) {
      return error;
    }

    const [createdUserProfie] = await db
      .insert(userProfiles)
      .values({
        ...data,
        user_id: userId,
        date_of_birth: data.date_of_birth
          ? data.date_of_birth.toISOString().split("T")[0]
          : undefined,
      })
      .returning({ id: userProfiles.id });
    if (!createdUserProfie?.id) return "";

    return createdUserProfie.id;
  }

  // ---------------------------------------------------------
  // Update
  // ---------------------------------------------------------
  async updateUserCore(
    data: UserInsertType,
    db: typeof pgDb
  ): Promise<string | z.ZodError> {
    const {
      data: parsed,
      success,
      error,
    } = validateWithZod(data, UserZValidation.updateUser);

    if (!success) {
      return error;
    }

    const { id, ...updateData } = parsed;

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (!updatedUser?.id) return "";
    return updatedUser.id;
  }
  async updateUserProfile(
    data: UserProfileInsertType,
    db: typeof pgDb
  ): Promise<string | z.ZodError> {
    const {
      data: parsed,
      success,
      error,
    } = validateWithZod(data, UserZValidation.updateProfile);

    if (!success) {
      return error;
    }

    const { id, date_of_birth, ...updateData } = parsed;

    const [updatedProfile] = await db
      .update(userProfiles)
      .set({
        ...updateData,
        date_of_birth: date_of_birth
          ? date_of_birth.toISOString().split("T")[0]
          : undefined,
      })
      .where(eq(userProfiles.id, id))
      .returning({ id: userProfiles.id });

    if (!updatedProfile?.id) return "";
    return updatedProfile.id;
  }

  async updateUserPhone(
    data: UserPhonesInsertType,
    db: typeof pgDb
  ): Promise<string | z.ZodError> {
    const {
      data: parsed,
      success,
      error,
    } = validateWithZod(data, UserZValidation.updatePhone);

    if (!success) {
      return error;
    }

    const { id, ...updateData } = parsed;

    const [updatedPhone] = await db
      .update(userPhones)
      .set(updateData)
      .where(eq(userPhones.id, id))
      .returning({ id: userPhones.id });

    if (!updatedPhone?.id) return "";
    return updatedPhone.id;
  }

  async updateUserEmail(
    data: UserEmailsInsertType,
    db: typeof pgDb
  ): Promise<string | z.ZodError> {
    const {
      data: parsed,
      success,
      error,
    } = validateWithZod(data, UserZValidation.updateEmail);

    if (!success) {
      return error;
    }

    const { id, ...updateData } = parsed;

    const [updatedEmail] = await db
      .update(userEmails)
      .set(updateData)
      .where(eq(userEmails.id, id))
      .returning({ id: userEmails.id });

    if (!updatedEmail?.id) return "";
    return updatedEmail.id;
  }

  async updateUserAddress(
    data: UserAddressInsertType,
    db: typeof pgDb
  ): Promise<string | z.ZodError> {
    const {
      data: parsed,
      success,
      error,
    } = validateWithZod(data, UserZValidation.updateAddress);

    if (!success) {
      return error;
    }

    const { id, ...updateData } = parsed;

    const [updatedAddress] = await db
      .update(userAddresses)
      .set(updateData)
      .where(eq(userAddresses.id, id))
      .returning({ id: userAddresses.id });

    if (!updatedAddress?.id) return "";
    return updatedAddress.id;
  }

  async updateUserContact(
    data: UserContactInsertType,
    db: typeof pgDb
  ): Promise<string | z.ZodError> {
    const {
      data: parsed,
      success,
      error,
    } = validateWithZod(data, UserZValidation.updateContact);

    if (!success) {
      return error;
    }

    const { id, ...updateData } = parsed;

    const [updatedContact] = await db
      .update(userContacts)
      .set(updateData)
      .where(eq(userContacts.id, id))
      .returning({ id: userContacts.id });

    if (!updatedContact?.id) return "";
    return updatedContact.id;
  }

  // ---------------------------------------------------------
  // Delete
  // ---------------------------------------------------------

  async deleteUserContact(
    id: Pick<UserContactInsertType, "id">,
    db: typeof pgDb
  ): Promise<string | z.ZodError> {
    const { data, success, error } = validateWithZod(
      id,
      UserZValidation.deleteUserContact
    );

    if (!success) {
      return error;
    }

    const [deletedContact] = await db
      .delete(userContacts)
      .where(eq(userContacts.id, data.id))
      .returning({ id: userContacts.id });

    if (!deletedContact?.id) return "";
    return deletedContact.id;
  }

  async deleteUserPhone(
    id: Pick<UserPhonesSelectType, "id">,
    db: typeof pgDb
  ): Promise<string | z.ZodError> {
    const { data, success, error } = validateWithZod(
      id,
      UserZValidation.deleteUserPhone
    );

    if (!success) {
      return error;
    }

    const [deletedPhone] = await db
      .delete(userPhones)
      .where(eq(userPhones.id, data.id))
      .returning({ id: userPhones.id });

    if (!deletedPhone?.id) return "";
    return deletedPhone.id;
  }

  async deleteUserEmail(
    id: Pick<UserEmailsSelectType, "id">,
    db: typeof pgDb
  ): Promise<string | z.ZodError> {
    const { data, success, error } = validateWithZod(
      id,
      UserZValidation.deleteUserEmail
    );

    if (!success) {
      return error;
    }

    const [deletedEmail] = await db
      .delete(userEmails)
      .where(eq(userEmails.id, data.id))
      .returning({ id: userEmails.id });

    if (!deletedEmail?.id) return "";
    return deletedEmail.id;
  }

  async deleteUserAddress(
    id: Pick<UserAddressSelectType, "id">,
    db: typeof pgDb
  ): Promise<string | z.ZodError> {
    const { data, success, error } = validateWithZod(
      id,
      UserZValidation.deleteUserAddress
    );

    if (!success) {
      return error;
    }

    const [deletedAddress] = await db
      .delete(userAddresses)
      .where(eq(userAddresses.id, data.id))
      .returning({ id: userAddresses.id });

    if (!deletedAddress?.id) return "";
    return deletedAddress.id;
  }

  async deleteUser(
    id: Pick<UserSelectType, "id">,
    db: typeof pgDb
  ): Promise<string | z.ZodError> {
    const { data, success, error } = validateWithZod(
      id,
      UserZValidation.deleteUser
    );

    if (!success) {
      return error;
    }

    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, data.id))
      .returning({ id: users.id });

    if (!deletedUser?.id) return "";
    return deletedUser.id;
  }
}
