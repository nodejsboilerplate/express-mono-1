import {
  userAddresses,
  userContactsTable,
  userEmails,
  userPhones,
  userProfilesTable,
  usersTable,
} from "@/database";
import type { PgDbClientType } from "@/libs/db.connect";
import type {
  CreateUserAddressInputType,
  CreateUserContactInputType,
  CreateUserCoreInputType,
  CreateUserEmailInputType,
  CreateUserPhoneInputType,
  CreateUserProfileInputType,
  DeleteByUserWithContextIdInputType,
  IdInputType,
  UpdateAddressInputType,
  UpdateContactInputType,
  UpdateEmailInputType,
  UpdatePhoneInputType,
  UpdateProfileInputType,
  UpdateUserInputType,
} from "@/zod";

import { and, eq } from "drizzle-orm";

interface UserServiceType {
  // ---------------------------------------------------------
  // Create
  // ---------------------------------------------------------
  createUserCore(
    payload: CreateUserCoreInputType,
    db: PgDbClientType
  ): Promise<string>;
  createUserProfile(
    payload: CreateUserProfileInputType,
    db: PgDbClientType
  ): Promise<string>;
  createUserContact(
    payload: CreateUserContactInputType,
    db: PgDbClientType
  ): Promise<string>;
  createUserPhone(
    payload: CreateUserPhoneInputType,
    db: PgDbClientType
  ): Promise<string>;
  createUserEmail(
    payload: CreateUserEmailInputType,
    db: PgDbClientType
  ): Promise<string>;
  createUserAddress(
    payload: CreateUserAddressInputType,
    db: PgDbClientType
  ): Promise<string>;

  // ---------------------------------------------------------
  // Update
  // ---------------------------------------------------------
  updateUserCore(
    payload: UpdateUserInputType,
    db: PgDbClientType
  ): Promise<string>;
  updateUserProfile(
    payload: UpdateProfileInputType,
    db: PgDbClientType
  ): Promise<string>;
  updateUserPhone(
    payload: UpdatePhoneInputType,
    db: PgDbClientType
  ): Promise<string>;
  updateUserEmail(
    payload: UpdateEmailInputType,
    db: PgDbClientType
  ): Promise<string>;
  updateUserAddress(
    payload: UpdateAddressInputType,
    db: PgDbClientType
  ): Promise<string>;
  updateUserContact(
    payload: UpdateContactInputType,
    db: PgDbClientType
  ): Promise<string>;

  // ---------------------------------------------------------
  // Delete
  // ---------------------------------------------------------
  deleteUserContact(
    payload: DeleteByUserWithContextIdInputType,
    db: PgDbClientType
  ): Promise<string>;
  deleteUserPhone(
    payload: DeleteByUserWithContextIdInputType,
    db: PgDbClientType
  ): Promise<string>;
  deleteUserEmail(
    payload: DeleteByUserWithContextIdInputType,
    db: PgDbClientType
  ): Promise<string>;
  deleteUserAddress(
    payload: DeleteByUserWithContextIdInputType,
    db: PgDbClientType
  ): Promise<string>;
  deleteUser(id: string, db: PgDbClientType): Promise<string>;
}

export class UserService implements UserServiceType {
  // ---------------------------------------------------------
  // Create
  // ---------------------------------------------------------
  async createUserCore(
    payload: CreateUserCoreInputType,
    db: PgDbClientType
  ): Promise<string> {
    const [user] = await db
      .insert(usersTable)
      .values(payload)
      .returning({ id: usersTable.id });

    if (!user?.id) return "";

    return user?.id;
  }

  async createUserAddress(
    payload: CreateUserAddressInputType,
    db: PgDbClientType
  ): Promise<string> {
    const [createdUserAddress] = await db
      .insert(userAddresses)
      .values(payload)
      .returning({ id: userAddresses.id });

    if (!createdUserAddress?.id) return "";
    return createdUserAddress?.id;
  }

  async createUserContact(
    payload: CreateUserContactInputType,
    db: PgDbClientType
  ): Promise<string> {
    const [createdUserContact] = await db
      .insert(userContactsTable)
      .values(payload)
      .returning({ id: userContactsTable.id });

    if (!createdUserContact?.id) return "";
    return createdUserContact?.id;
  }

  async createUserEmail(
    payload: CreateUserEmailInputType,
    db: PgDbClientType
  ): Promise<string> {
    const [createdUserEmail] = await db
      .insert(userEmails)
      .values(payload)
      .returning({ id: userEmails.id });

    if (!createdUserEmail?.id) return "";

    return createdUserEmail.id;
  }

  async createUserPhone(
    payload: CreateUserPhoneInputType,
    db: PgDbClientType
  ): Promise<string> {
    const [createdUserPhone] = await db
      .insert(userPhones)
      .values(payload)
      .returning({ id: userPhones.id });
    if (!createdUserPhone?.id) return "";

    return createdUserPhone.id;
  }

  async createUserProfile(
    payload: CreateUserProfileInputType,
    db: PgDbClientType
  ): Promise<string> {
    const [createdUserProfie] = await db
      .insert(userProfilesTable)
      .values({
        ...payload,
        date_of_birth: payload.date_of_birth
          ? payload.date_of_birth.toISOString().split("T")[0]
          : undefined,
      })
      .returning({ id: userProfilesTable.id });
    if (!createdUserProfie?.id) return "";

    return createdUserProfie.id;
  }

  // ---------------------------------------------------------
  // Update
  // ---------------------------------------------------------
  async updateUserCore(
    payload: UpdateUserInputType,
    db: PgDbClientType
  ): Promise<string> {
    const { id, ...updateData } = payload;
    const [updatedUser] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id });

    if (!updatedUser?.id) return "";
    return updatedUser.id;
  }

  async updateUserProfile(
    payload: UpdateProfileInputType,
    db: PgDbClientType
  ): Promise<string> {
    const { date_of_birth, user_id, ...updateData } = payload;

    const [updatedProfile] = await db
      .update(userProfilesTable)
      .set({
        ...updateData,
        date_of_birth: date_of_birth
          ? date_of_birth.toISOString().split("T")[0]
          : undefined,
      })
      .where(eq(userProfilesTable.user_id, user_id))
      .returning({ id: userProfilesTable.id });

    if (!updatedProfile?.id) return "";
    return updatedProfile.id;
  }

  async updateUserPhone(
    payload: UpdatePhoneInputType,
    db: PgDbClientType
  ): Promise<string> {
    const { user_id, id, ...updateData } = payload;

    const [updatedPhone] = await db
      .update(userPhones)
      .set(updateData)
      .where(and(eq(userPhones.user_id, user_id), eq(userPhones.id, id)))
      .returning({ id: userPhones.id });

    if (!updatedPhone?.id) return "";
    return updatedPhone.id;
  }

  async updateUserEmail(
    payload: UpdateEmailInputType,
    db: PgDbClientType
  ): Promise<string> {
    const { user_id, id, ...updateData } = payload;

    const [updatedEmail] = await db
      .update(userEmails)
      .set(updateData)
      .where(and(eq(userEmails.user_id, user_id), eq(userEmails.id, id)))
      .returning({ id: userEmails.id });

    if (!updatedEmail?.id) return "";
    return updatedEmail.id;
  }

  async updateUserAddress(
    payload: UpdateAddressInputType,
    db: PgDbClientType
  ): Promise<string> {
    const { user_id, id, ...updateData } = payload;

    const [updatedAddress] = await db
      .update(userAddresses)
      .set(updateData)
      .where(and(eq(userAddresses.user_id, user_id), eq(userAddresses.id, id)))
      .returning({ id: userAddresses.id });

    if (!updatedAddress?.id) return "";
    return updatedAddress.id;
  }

  async updateUserContact(
    payload: UpdateContactInputType,
    db: PgDbClientType
  ): Promise<string> {
    const { user_id, ...updateData } = payload;

    const [updatedContact] = await db
      .update(userContactsTable)
      .set(updateData)
      .where(eq(userContactsTable.user_id, user_id))
      .returning({ id: userContactsTable.id });

    if (!updatedContact?.id) return "";
    return updatedContact.id;
  }

  // ---------------------------------------------------------
  // Delete
  // ---------------------------------------------------------

  async deleteUserContact(
    payload: DeleteByUserWithContextIdInputType,
    db: PgDbClientType
  ): Promise<string> {
    const [deletedContact] = await db
      .delete(userContactsTable)
      .where(
        and(
          eq(userContactsTable.id, payload.id),
          eq(userContactsTable.user_id, payload.user_id)
        )
      )
      .returning({ id: userContactsTable.id });

    if (!deletedContact?.id) return "";
    return deletedContact.id;
  }

  async deleteUserPhone(
    payload: DeleteByUserWithContextIdInputType,
    db: PgDbClientType
  ): Promise<string> {
    const [deletedPhone] = await db
      .delete(userPhones)
      .where(
        and(
          eq(userPhones.id, payload.id),
          eq(userPhones.user_id, payload.user_id)
        )
      )
      .returning({ id: userPhones.id });

    if (!deletedPhone?.id) return "";
    return deletedPhone.id;
  }

  async deleteUserEmail(
    payload: DeleteByUserWithContextIdInputType,
    db: PgDbClientType
  ): Promise<string> {
    const [deletedEmail] = await db
      .delete(userEmails)
      .where(
        and(
          eq(userEmails.id, payload.id),
          eq(userEmails.user_id, payload.user_id)
        )
      )
      .returning({ id: userEmails.id });

    if (!deletedEmail?.id) return "";
    return deletedEmail.id;
  }

  async deleteUserAddress(
    payload: DeleteByUserWithContextIdInputType,
    db: PgDbClientType
  ): Promise<string> {
    const [deletedAddress] = await db
      .delete(userAddresses)
      .where(
        and(
          eq(userAddresses.id, payload.id),
          eq(userAddresses.user_id, payload.user_id)
        )
      )
      .returning({ id: userAddresses.id });

    if (!deletedAddress?.id) return "";
    return deletedAddress.id;
  }

  async deleteUser(payload: IdInputType, db: PgDbClientType): Promise<string> {
    const [deletedUser] = await db
      .delete(usersTable)
      .where(eq(usersTable.id, payload))
      .returning({ id: usersTable.id });

    if (!deletedUser?.id) return "";
    return deletedUser.id;
  }
}
