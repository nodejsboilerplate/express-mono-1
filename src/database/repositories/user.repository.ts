import { getSystemCustomErrorMsgByKey } from "@/events";
import { ApiError } from "@/libs";
import {
  userAddressesTable,
  userContactsTable,
  userEmailsTable,
  userPhonesTable,
  userProfilesTable,
  usersTable,
} from "../schemas";
import { pgDb } from "@/libs/db.connect";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import type {
  CreateUserAddressInputType,
  CreateUserContactInputType,
  CreateUserEmailInputType,
  CreateUserPhoneInputType,
  CreateUserWithProfileInputType,
  EmailZType,
  UpdateAddressInputType,
  UpdateContactInputType,
  UpdateEmailInputType,
  UpdatePhoneInputType,
  UpdateProfileInputType,
} from "@/zod";

export class UserRepository {
  async CreateNewUserAndProfile(data: CreateUserWithProfileInputType) {
    const { user: user_payload, profile: profile_payload } = data;
    const result = await pgDb.transaction(async (tx) => {
      const [user] = await tx
        .insert(usersTable)
        .values(user_payload)
        .returning({ id: usersTable.id });

      if (!user?.id) {
        throw new ApiError(
          500,
          getSystemCustomErrorMsgByKey("USER_CREATION_FAILED")
        );
      }

      const hashedPassword = await bcrypt.hash(user_payload.password, 10);

      await tx
        .update(usersTable)
        .set({ password: hashedPassword })
        .where(eq(usersTable.id, user.id));

      const [createdUserProfie] = await tx
        .insert(userProfilesTable)
        .values({
          ...profile_payload,
          user_id: user.id,
          date_of_birth: profile_payload.date_of_birth
            ? profile_payload.date_of_birth.toISOString().split("T")[0]
            : undefined,
        })
        .returning({ id: userProfilesTable.id });

      if (!createdUserProfie?.id) {
        throw new ApiError(
          500,
          getSystemCustomErrorMsgByKey("PROFILE_CREATION_FAILED")
        );
      }

      return { userId: user.id, profileId: createdUserProfie.id };
    });

    return result;
  }

  async CreateNewAddress(data: CreateUserAddressInputType) {
    const [newAddress] = await pgDb
      .insert(userAddressesTable)
      .values(data)
      .returning({ id: userAddressesTable.id });

    return newAddress;
  }

  async CreateNewContact(data: CreateUserContactInputType) {
    const [newContact] = await pgDb
      .insert(userContactsTable)
      .values(data)
      .returning({ id: userContactsTable.id });
    return newContact;
  }

  async CreateNewPhone(data: CreateUserPhoneInputType) {
    const [newPhone] = await pgDb
      .insert(userPhonesTable)
      .values(data)
      .returning({ id: userPhonesTable.id });

    return newPhone;
  }

  async CreateNewEmail(data: CreateUserEmailInputType) {
    const [newEmail] = await pgDb
      .insert(userEmailsTable)
      .values(data)
      .returning({ id: userEmailsTable.id });

    return newEmail;
  }

  async SetPhoneVerifyCode(
    code: string,
    expiry: Date,
    phone_table_id: string,
    user_id: string
  ) {
    const [updatedPhone] = await pgDb
      .update(userPhonesTable)
      .set({
        verify_code: code,
        verify_expiry: expiry,
      })
      .where(
        and(
          eq(userPhonesTable.id, phone_table_id),
          eq(userPhonesTable.user_id, user_id),
          eq(userPhonesTable.is_verified, false)
        )
      )
      .returning({ id: userPhonesTable.id });

    return updatedPhone;
  }

  async SetEmailVerifyCode(
    code: string,
    expiry: Date,
    email_table_id: string,
    user_id: string
  ) {
    const [updatedEmail] = await pgDb
      .update(userEmailsTable)
      .set({
        verify_code: code,
        verify_expiry: expiry,
      })
      .where(
        and(
          eq(userEmailsTable.id, email_table_id),
          eq(userEmailsTable.user_id, user_id),
          eq(userEmailsTable.is_verified, false)
        )
      )
      .returning({ id: userEmailsTable.id });

    return updatedEmail;
  }

  async GetContactPhoneVerifyDetails(phone_id: string) {
    const phone = await pgDb.query.userPhonesTable.findFirst({
      where: {
        id: { eq: phone_id },
      },
      columns: {
        id: true,
        is_verified: true,
        verify_code: true,
        verify_expiry: true,
      },
    });

    return phone;
  }

  async GetContactEmailVerifyDetails(email_table_id: string) {
    const email = await pgDb.query.userEmailsTable.findFirst({
      where: {
        id: { eq: email_table_id },
      },
      columns: {
        id: true,
        is_verified: true,
        verify_code: true,
        verify_expiry: true,
      },
    });

    return email;
  }

  async GetUserCoreBasicDetailsByEmail(data: EmailZType) {
    return await pgDb.query.usersTable.findFirst({
      columns: {
        id: true,
        email: true,
        username: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
      where: {
        email: { eq: data },
      },
    });
  }

  async UpdateUserProfile(data: UpdateProfileInputType) {
    const { date_of_birth, user_id, id, ...updateData } = data;

    const [updatedProfile] = await pgDb
      .update(userProfilesTable)
      .set({
        ...updateData,
        date_of_birth: date_of_birth
          ? date_of_birth.toISOString().split("T")[0]
          : undefined,
      })
      .where(
        and(
          eq(userProfilesTable.user_id, user_id),
          eq(userProfilesTable.id, id)
        )
      )
      .returning({ id: userProfilesTable.id });

    return updatedProfile;
  }

  async UpdateContact(data: UpdateContactInputType) {
    const { user_id, ...updateData } = data;

    const [updatedContact] = await pgDb
      .update(userContactsTable)
      .set(updateData)
      .where(eq(userContactsTable.user_id, user_id))
      .returning({ id: userContactsTable.id });

    return updatedContact;
  }

  async UpdateContactPhone(data: UpdatePhoneInputType) {
    const { user_id, id, ...updateData } = data;

    const [updatedPhone] = await pgDb
      .update(userPhonesTable)
      .set(updateData)
      .where(
        and(eq(userPhonesTable.user_id, user_id), eq(userPhonesTable.id, id))
      )
      .returning({ id: userPhonesTable.id });

    return updatedPhone;
  }

  async UpdateContactEmail(data: UpdateEmailInputType) {
    const { user_id, id, ...updateData } = data;

    const [updatedEmail] = await pgDb
      .update(userEmailsTable)
      .set(updateData)
      .where(
        and(eq(userEmailsTable.user_id, user_id), eq(userEmailsTable.id, id))
      )
      .returning({ id: userEmailsTable.id });
    return updatedEmail;
  }

  async UpdateAddress(data: UpdateAddressInputType) {
    const { user_id, id, ...updateData } = data;

    const [updatedAddress] = await pgDb
      .update(userAddressesTable)
      .set(updateData)
      .where(
        and(
          eq(userAddressesTable.user_id, user_id),
          eq(userAddressesTable.id, id)
        )
      )
      .returning({ id: userAddressesTable.id });
    return updatedAddress;
  }

  async DeleteUserById(id: string) {
    const [deletedUser] = await pgDb
      .delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id });

    return deletedUser;
  }

  async DeleteSingleContact(contact_id: string, user_id: string) {
    const [deletedContact] = await pgDb
      .delete(userContactsTable)
      .where(
        and(
          eq(userContactsTable.id, contact_id),
          eq(userContactsTable.user_id, user_id)
        )
      )
      .returning({ id: userContactsTable.id });

    return deletedContact;
  }

  async DeleteSingleContactPhone(phone_id: string, user_id: string) {
    const [deletedPhone] = await pgDb
      .delete(userPhonesTable)
      .where(
        and(
          eq(userPhonesTable.id, phone_id),
          eq(userPhonesTable.user_id, user_id)
        )
      )
      .returning({ id: userPhonesTable.id });

    return deletedPhone;
  }

  async DeleteSingleContactEmail(email_table_id: string, user_id: string) {
    const [deletedEmail] = await pgDb
      .delete(userEmailsTable)
      .where(
        and(
          eq(userEmailsTable.id, email_table_id),
          eq(userEmailsTable.user_id, user_id)
        )
      )
      .returning({ id: userEmailsTable.id });

    return deletedEmail;
  }

  async DeleteSingleAddress(address_id: string, user_id: string) {
    const [deletedAddress] = await pgDb
      .delete(userAddressesTable)
      .where(
        and(
          eq(userAddressesTable.id, address_id),
          eq(userAddressesTable.user_id, user_id)
        )
      )
      .returning({ id: userAddressesTable.id });

    return deletedAddress;
  }

  async GetUserDataForLoginByEmailOrUsername(data: string) {
    const result = await pgDb.query.usersTable.findFirst({
      columns: {
        id: true,
        email: true,
        password: true,
        username: true,
        role: true,
        is_verified: true,
      },
      where: {
        OR: [
          {
            email: { eq: data },
          },
          {
            username: { eq: data },
          },
        ],
      },
    });

    return result;
  }

  async SetVerifyCodeForLogin(code: string, expiry: Date, user_id: string) {
    const [user] = await pgDb
      .update(usersTable)
      .set({
        verify_code: code,
        verify_expiry: expiry,
      })
      .where(and(eq(usersTable.id, user_id), eq(usersTable.is_verified, false)))
      .returning({
        id: usersTable.id,
      });

    return user;
  }

  async GetUserVerifyDetails(user_id: string) {
    const user = await pgDb.query.usersTable.findFirst({
      where: {
        id: {
          eq: user_id,
        },
      },
      columns: {
        id: true,
        is_verified: true,
        verify_code: true,
        verify_expiry: true,
      },
    });

    return user;
  }

  async UpdateUserVerifyDetails(user_id: string) {
    const [verifiedUser] = await pgDb
      .update(usersTable)
      .set({
        is_verified: true,
        verify_code: null,
        verify_expiry: null,
      })
      .where(eq(usersTable.id, user_id))
      .returning({
        id: usersTable.id,
      });

    return verifiedUser;
  }
}
