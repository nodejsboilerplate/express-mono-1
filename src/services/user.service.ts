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
    UserContactInsertType,
    UserEmailsInsertType,
    UserInsertType,
    UserPhonesInsertType,
    UserProfileInsertType,
} from "@/database/type";
import type { PgDbClientType } from "@/libs/db.connect";
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
import { and, eq } from "drizzle-orm";
import type z from "zod";

interface UserServiceType {
    // =========================================================
    // Create
    // =========================================================
    createUserCore(
        payload: CreateUserCoreInput,
        db: PgDbClientType
    ): Promise<string | z.ZodError>;
    createUserProfile(
        userId: string,
        payload: CreateUserProfileInput,
        db: PgDbClientType
    ): Promise<string | z.ZodError>;
    createUserContact(
        userId: string,
        payload: CreateUserContactInput,
        db: PgDbClientType
    ): Promise<string | z.ZodError>;
    createUserPhone(
        userId: string,
        contactId: string,
        payload: CreateUserPhoneInput,
        db: PgDbClientType
    ): Promise<string | z.ZodError>;
    createUserEmail(
        userId: string,
        contactId: string,
        payload: CreateUserEmailInput,
        db: PgDbClientType
    ): Promise<string | z.ZodError>;
    createUserAddress(
        userId: string,
        payload: CreateUserAddressInput,
        db: PgDbClientType
    ): Promise<string | z.ZodError>;

    // =========================================================
    // Update
    // =========================================================
    updateUserCore(
        userId: string,
        data: Partial<UserInsertType>,
        db: PgDbClientType
    ): Promise<string | z.ZodError>;
    updateUserProfile(
        userId: string,
        data: Partial<Omit<UserProfileInsertType, "id">>,
        db: PgDbClientType
    ): Promise<string | z.ZodError>;
    updateUserPhone(
        userId: string,
        id: string,
        data: Partial<Omit<UserPhonesInsertType, "id">>,
        db: PgDbClientType
    ): Promise<string | z.ZodError>;
    updateUserEmail(
        userId: string,
        id: string,
        data: Partial<Omit<UserEmailsInsertType, "id">>,
        db: PgDbClientType
    ): Promise<string | z.ZodError>;
    updateUserAddress(
        userId: string,
        id: string,
        data: Partial<Omit<UserAddressInsertType, "id">>,
        db: PgDbClientType
    ): Promise<string | z.ZodError>;
    updateUserContact(
        userId: string,
        data: Partial<Omit<UserContactInsertType, "id">>,
        db: PgDbClientType
    ): Promise<string | z.ZodError>;

    // =========================================================
    // Delete
    // =========================================================
    deleteUserContact(
        userId: string,
        id: string,
        db: PgDbClientType
    ): Promise<string | z.ZodError>;
    deleteUserPhone(
        userId: string,
        id: string,
        db: PgDbClientType
    ): Promise<string | z.ZodError>;
    deleteUserEmail(
        userId: string,
        id: string,
        db: PgDbClientType
    ): Promise<string | z.ZodError>;
    deleteUserAddress(
        userId: string,
        id: string,
        db: PgDbClientType
    ): Promise<string | z.ZodError>;
    deleteUser(
        id: string,
        db: PgDbClientType
    ): Promise<string | z.ZodError>;
}

export class UserService implements UserServiceType {
    // ---------------------------------------------------------
    // Create
    // ---------------------------------------------------------
    async createUserCore(
        payload: CreateUserCoreInput,
        db: PgDbClientType
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
        db: PgDbClientType
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
        db: PgDbClientType
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
        userId: string,
        contactId: string,
        payload: CreateUserEmailInput,
        db: PgDbClientType
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
            .values({ ...data, contact_id: contactId, user_id: userId })
            .returning({ id: userEmails.id });

        if (!createdUserEmail?.id) return "";

        return createdUserEmail.id;
    }

    async createUserPhone(
        userId: string,
        contactId: string,
        payload: CreateUserPhoneInput,
        db: PgDbClientType
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
            .values({ ...data, contact_id: contactId, user_id: userId })
            .returning({ id: userPhones.id });
        if (!createdUserPhone?.id) return "";

        return createdUserPhone.id;
    }

    async createUserProfile(
        userId: string,
        payload: CreateUserProfileInput,
        db: PgDbClientType
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
        userId: string,
        data: Partial<UserInsertType>,
        db: PgDbClientType
    ): Promise<string | z.ZodError> {
        const {
            data: parsed,
            success,
            error,
        } = validateWithZod(data, UserZValidation.updateUser);

        if (!success) {
            return error;
        }



        const [updatedUser] = await db
            .update(users)
            .set(parsed)
            .where(eq(users.id, userId))
            .returning({ id: users.id });

        if (!updatedUser?.id) return "";
        return updatedUser.id;
    }
    async updateUserProfile(
        userId: string,
        data: Partial<UserProfileInsertType>,
        db: PgDbClientType
    ): Promise<string | z.ZodError> {
        const {
            data: parsed,
            success,
            error,
        } = validateWithZod(data, UserZValidation.updateProfile);

        if (!success) {
            return error;
        }

        const { date_of_birth, ...updateData } = parsed;

        const [updatedProfile] = await db
            .update(userProfiles)
            .set({
                ...updateData,
                date_of_birth: date_of_birth
                    ? date_of_birth.toISOString().split("T")[0]
                    : undefined,
            })
            .where(eq(userProfiles.user_id, userId))
            .returning({ id: userProfiles.id });

        if (!updatedProfile?.id) return "";
        return updatedProfile.id;
    }

    async updateUserPhone(
        userId: string,
        id: string,
        data: Partial<Omit<UserPhonesInsertType, "id">>,
        db: PgDbClientType
    ): Promise<string | z.ZodError> {
        const {
            data: parsed,
            success,
            error,
        } = validateWithZod({ ...data, id }, UserZValidation.updatePhone);

        if (!success) {
            return error;
        }


        const [updatedPhone] = await db
            .update(userPhones)
            .set(parsed)
            .where(and(eq(userPhones.user_id, userId), eq(userPhones.id, parsed.id)))
            .returning({ id: userPhones.id });

        if (!updatedPhone?.id) return "";
        return updatedPhone.id;
    }

    async updateUserEmail(
        userId: string,
        id: string,
        data: Partial<Omit<UserEmailsInsertType, "id">>,
        db: PgDbClientType
    ): Promise<string | z.ZodError> {
        const {
            data: parsed,
            success,
            error,
        } = validateWithZod({ ...data, id }, UserZValidation.updateEmail);

        if (!success) {
            return error;
        }



        const [updatedEmail] = await db
            .update(userEmails)
            .set(parsed)
            .where(and(eq(userEmails.user_id, userId), eq(userEmails.id, parsed.id)))
            .returning({ id: userEmails.id });

        if (!updatedEmail?.id) return "";
        return updatedEmail.id;
    }

    async updateUserAddress(
        userId: string,
        id: string,
        data: Partial<Omit<UserAddressInsertType, "id">>,
        db: PgDbClientType
    ): Promise<string | z.ZodError> {
        const {
            data: parsed,
            success,
            error,
        } = validateWithZod({ ...data, id }, UserZValidation.updateAddress);

        if (!success) {
            return error;
        }



        const [updatedAddress] = await db
            .update(userAddresses)
            .set(parsed)
            .where(and(eq(userAddresses.user_id, userId), eq(userAddresses.id, parsed.id)))
            .returning({ id: userAddresses.id });

        if (!updatedAddress?.id) return "";
        return updatedAddress.id;
    }

    async updateUserContact(
        userId: string,
        data: Partial<Omit<UserContactInsertType, "id">>,
        db: PgDbClientType
    ): Promise<string | z.ZodError> {
        const {
            data: parsed,
            success,
            error,
        } = validateWithZod(data, UserZValidation.updateContact);

        if (!success) {
            return error;
        }



        const [updatedContact] = await db
            .update(userContacts)
            .set(parsed)
            .where(eq(userContacts.user_id, userId))
            .returning({ id: userContacts.id });

        if (!updatedContact?.id) return "";
        return updatedContact.id;
    }

    // ---------------------------------------------------------
    // Delete
    // ---------------------------------------------------------

    async deleteUserContact(
        userId: string,
        id: string,
        db: PgDbClientType
    ): Promise<string | z.ZodError> {
        const { data: parsedId, success, error } = validateWithZod(
            id,
            UserZValidation.id
        );

        if (!success) {
            return error;
        }

        const [deletedContact] = await db
            .delete(userContacts)
            .where(and(eq(userContacts.id, parsedId), eq(userContacts.user_id, userId)))
            .returning({ id: userContacts.id });

        if (!deletedContact?.id) return "";
        return deletedContact.id;
    }

    async deleteUserPhone(
        userId: string,
        id: string,
        db: PgDbClientType
    ): Promise<string | z.ZodError> {
        const { data: parsedId, success, error } = validateWithZod(
            id,
            UserZValidation.id
        );

        if (!success) {
            return error;
        }

        const [deletedPhone] = await db
            .delete(userPhones)
            .where(and(eq(userPhones.id, parsedId), eq(userPhones.user_id, userId)))
            .returning({ id: userPhones.id });

        if (!deletedPhone?.id) return "";
        return deletedPhone.id;
    }

    async deleteUserEmail(
        userId: string,
        id: string,
        db: PgDbClientType
    ): Promise<string | z.ZodError> {
        const { data: parsedId, success, error } = validateWithZod(
            id,
            UserZValidation.id
        );

        if (!success) {
            return error;
        }

        const [deletedEmail] = await db
            .delete(userEmails)
            .where(and(eq(userEmails.id, parsedId), eq(userEmails.user_id, userId)))
            .returning({ id: userEmails.id });

        if (!deletedEmail?.id) return "";
        return deletedEmail.id;
    }

    async deleteUserAddress(
        userId: string,
        id: string,
        db: PgDbClientType
    ): Promise<string | z.ZodError> {
        const { data: parsedId, success, error } = validateWithZod(
            id,
            UserZValidation.id
        );

        if (!success) {
            return error;
        }

        const [deletedAddress] = await db
            .delete(userAddresses)
            .where(and(eq(userAddresses.id, parsedId), eq(userAddresses.user_id, userId)))
            .returning({ id: userAddresses.id });

        if (!deletedAddress?.id) return "";
        return deletedAddress.id;
    }

    async deleteUser(
        id: string,
        db: PgDbClientType
    ): Promise<string | z.ZodError> {
        const { data: parsedId, success, error } = validateWithZod(
            id,
            UserZValidation.id
        );

        if (!success) {
            return error;
        }

        const [deletedUser] = await db
            .delete(users)
            .where(eq(users.id, parsedId))
            .returning({ id: users.id });

        if (!deletedUser?.id) return "";
        return deletedUser.id;
    }
}
