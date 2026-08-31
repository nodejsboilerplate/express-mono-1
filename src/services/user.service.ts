import {
  userAddressesTable,
  userContactsTable,
  userEmailsTable,
  userPhonesTable,
  userProfilesTable,
  usersTable,
} from "@/database";
import { getSystemCustomErrorMsgByKey } from "@/events";
import { ApiError } from "@/libs";
import { pgDb } from "@/libs/db.connect";
import {
  generateVerificationCode,
  getVerifyExpiry,
  isZodError,
  validationError,
} from "@/utils";
import { userInputValidators } from "@/validators/inputs";
import type {
  CreateUserAddressInputType,
  CreateUserContactInputType,
  CreateUserEmailInputType,
  CreateUserPhoneInputType,
  CreateUserWithProfileInputType,
  EmailZType,
  IdZType,
  UpdateAddressInputType,
  UpdateContactInputType,
  UpdateEmailInputType,
  UpdatePhoneInputType,
  UpdateProfileInputType,
  UserIdWithContextIdInputType,
  VerifyCodeWithUserIdInput,
} from "@/zod";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";

class UserService {
  // ---------------------------------------------------------
  // Create
  // ---------------------------------------------------------
  async createUserWithProfile(
    payload: CreateUserWithProfileInputType
  ): Promise<{ userId: string; profileId: string }> {
    const parse_payload =
      userInputValidators.createUserWithProfileInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const { user: user_payload, profile: profile_payload } = parse_payload;

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

  async createUserAddress(
    payload: CreateUserAddressInputType
  ): Promise<string> {
    const parse_payload = userInputValidators.createUserAddressInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const [createdUserAddress] = await pgDb
      .insert(userAddressesTable)
      .values(parse_payload)
      .returning({ id: userAddressesTable.id });

    if (!createdUserAddress?.id) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("ADDRESS_CREATION_FAILED")
      );
    }

    return createdUserAddress?.id;
  }

  async createUserContact(
    payload: CreateUserContactInputType
  ): Promise<string> {
    const parse_payload = userInputValidators.createUserContactInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const [createdUserContact] = await pgDb
      .insert(userContactsTable)
      .values(parse_payload)
      .returning({ id: userContactsTable.id });

    if (!createdUserContact?.id) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("CONTACT_CREATION_FAILED")
      );
    }

    return createdUserContact?.id;
  }

  async createUserPhone(payload: CreateUserPhoneInputType): Promise<string> {
    const parse_payload = userInputValidators.createUserPhoneInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const [createdUserPhone] = await pgDb
      .insert(userPhonesTable)
      .values(parse_payload)
      .returning({ id: userPhonesTable.id });

    if (!createdUserPhone?.id) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("PHONE_CREATION_FAILED")
      );
    }

    return createdUserPhone.id;
  }

  async createUserEmail(payload: CreateUserEmailInputType): Promise<string> {
    const parse_payload = userInputValidators.createUserEmailInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const [createdUserEmail] = await pgDb
      .insert(userEmailsTable)
      .values(parse_payload)
      .returning({ id: userEmailsTable.id });

    if (!createdUserEmail?.id) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("EMAIL_CREATION_FAILED")
      );
    }

    return createdUserEmail.id;
  }

  // ---------------------------------------------------------
  // Send Verification Code
  // ---------------------------------------------------------

  async sendVerificationCodeForPhone(
    payload: UserIdWithContextIdInputType
  ): Promise<string> {
    const parse_payload = userInputValidators.userIdWithContextIdInput(payload);
    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const verify_code = generateVerificationCode();
    const verify_expiry = getVerifyExpiry();

    const [phone] = await pgDb
      .update(userPhonesTable)
      .set({
        verify_code,
        verify_expiry,
      })
      .where(
        and(
          eq(userPhonesTable.id, parse_payload.id),
          eq(userPhonesTable.user_id, parse_payload.user_id),
          eq(userPhonesTable.is_verified, false)
        )
      )
      .returning({ id: userPhonesTable.id });

    if (!phone) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    return phone.id;
  }

  async sendVerificationCodeForEmail(
    payload: UserIdWithContextIdInputType
  ): Promise<string> {
    const parse_payload = userInputValidators.userIdWithContextIdInput(payload);
    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const verify_code = generateVerificationCode();
    const verify_expiry = getVerifyExpiry();

    const [email] = await pgDb
      .update(userEmailsTable)
      .set({
        verify_code,
        verify_expiry,
      })
      .where(
        and(
          eq(userEmailsTable.id, parse_payload.id),
          eq(userEmailsTable.user_id, parse_payload.user_id),
          eq(userEmailsTable.is_verified, false)
        )
      )
      .returning({ id: userEmailsTable.id });

    if (!email) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("EMAIL_NOT_FOUND"));
    }

    return email.id;
  }

  // ---------------------------------------------------------
  // Verifications
  // ---------------------------------------------------------

  async verifyContactPhone(
    payload: VerifyCodeWithUserIdInput
  ): Promise<string> {
    const parse_payload = userInputValidators.verifyCodeWithUserId(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const [user_phone] = await pgDb
      .select({
        id: userPhonesTable.id,
        is_verified: userPhonesTable.is_verified,
        verify_code: userPhonesTable.verify_code,
        verify_expiry: userPhonesTable.verify_expiry,
      })
      .from(userPhonesTable)
      .where(eq(userPhonesTable.id, parse_payload.id));

    if (!user_phone) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    if (user_phone.is_verified) {
      throw new ApiError(
        409,
        getSystemCustomErrorMsgByKey("PHONE_ALREADY_VERIFIED")
      );
    }

    if (
      !user_phone.verify_code ||
      user_phone.verify_code !== parse_payload.verify_code
    ) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("INVALID_VERIFICATION_CODE")
      );
    }

    if (
      !user_phone.verify_expiry ||
      user_phone.verify_expiry.getTime() < Date.now()
    ) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("VERIFICATION_CODE_EXPIRED")
      );
    }

    const result = await this.updateUserPhone({
      ...parse_payload,
      is_verified: true,
      verify_code: null,
      verify_expiry: null,
    });

    if (!result) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    return result;
  }

  async verifyContactEmail(
    payload: VerifyCodeWithUserIdInput
  ): Promise<string> {
    const parse_payload = userInputValidators.verifyCodeWithUserId(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const [user_email] = await pgDb
      .select({
        id: userEmailsTable.id,
        is_verified: userEmailsTable.is_verified,
        verify_code: userEmailsTable.verify_code,
        verify_expiry: userEmailsTable.verify_expiry,
      })
      .from(userEmailsTable)
      .where(eq(userEmailsTable.id, parse_payload.id));

    if (!user_email) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("EMAIL_NOT_FOUND"));
    }

    if (user_email.is_verified) {
      throw new ApiError(
        409,
        getSystemCustomErrorMsgByKey("EMAIL_ALREADY_VERIFIED")
      );
    }

    if (
      !user_email.verify_code ||
      user_email.verify_code !== parse_payload.verify_code
    ) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("INVALID_VERIFICATION_CODE")
      );
    }

    if (
      !user_email.verify_expiry ||
      user_email.verify_expiry.getTime() < Date.now()
    ) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("VERIFICATION_CODE_EXPIRED")
      );
    }

    const result = await this.updateUserEmail({
      ...parse_payload,
      is_verified: true,
      verify_code: null,
      verify_expiry: null,
    });

    if (!result) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("EMAIL_NOT_FOUND"));
    }

    return result;
  }

  async getUser(payload: EmailZType) {
    const parse_payload = userInputValidators.emailInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const result = await pgDb.query.usersTable.findFirst({
      columns: {
        id: true,
        email: true,
        username: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
      where: {
        email: { eq: parse_payload },
      },
    });

    if (!result) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("USER_NOT_FOUND"));
    }

    return result;
  }
  // ---------------------------------------------------------
  // Update
  // ---------------------------------------------------------

  async updateUserProfile(payload: UpdateProfileInputType): Promise<string> {
    const parse_payload = userInputValidators.updateUserProfileInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const { date_of_birth, user_id, id, ...updateData } = parse_payload;

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

    if (!updatedProfile?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    return updatedProfile.id;
  }

  async updateUserContact(payload: UpdateContactInputType): Promise<string> {
    const parse_payload = userInputValidators.updateUserContactInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const { user_id, ...updateData } = parse_payload;

    const [updatedContact] = await pgDb
      .update(userContactsTable)
      .set(updateData)
      .where(eq(userContactsTable.user_id, user_id))
      .returning({ id: userContactsTable.id });

    if (!updatedContact?.id) {
      throw new ApiError(
        404,
        getSystemCustomErrorMsgByKey("CONTACT_NOT_FOUND")
      );
    }

    return updatedContact.id;
  }

  async updateUserPhone(payload: UpdatePhoneInputType): Promise<string> {
    const parse_payload = userInputValidators.updateUserPhoneInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);
    const { user_id, id, ...updateData } = parse_payload;

    const [updatedPhone] = await pgDb
      .update(userPhonesTable)
      .set(updateData)
      .where(
        and(eq(userPhonesTable.user_id, user_id), eq(userPhonesTable.id, id))
      )
      .returning({ id: userPhonesTable.id });

    if (!updatedPhone?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    return updatedPhone.id;
  }

  async updateUserEmail(payload: UpdateEmailInputType): Promise<string> {
    const parse_payload = userInputValidators.updateUserEmailInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);
    const { user_id, id, ...updateData } = parse_payload;

    const [updatedEmail] = await pgDb
      .update(userEmailsTable)
      .set(updateData)
      .where(
        and(eq(userEmailsTable.user_id, user_id), eq(userEmailsTable.id, id))
      )
      .returning({ id: userEmailsTable.id });

    if (!updatedEmail?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("EMAIL_NOT_FOUND"));
    }

    return updatedEmail.id;
  }

  async updateUserAddress(payload: UpdateAddressInputType): Promise<string> {
    const parse_payload = userInputValidators.updateUserAddressInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);
    const { user_id, id, ...updateData } = parse_payload;

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

    if (!updatedAddress?.id) {
      throw new ApiError(
        404,
        getSystemCustomErrorMsgByKey("ADDRESS_NOT_FOUND")
      );
    }

    return updatedAddress.id;
  }

  // ---------------------------------------------------------
  // Delete
  // ---------------------------------------------------------

  async deleteUser(payload: IdZType): Promise<string> {
    const parse_id = userInputValidators.idInput(payload);

    if (isZodError(parse_id)) throw validationError(parse_id);

    const [deletedUser] = await pgDb
      .delete(usersTable)
      .where(eq(usersTable.id, parse_id))
      .returning({ id: usersTable.id });

    if (!deletedUser?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("USER_NOT_FOUND"));
    }

    return deletedUser.id;
  }

  async deleteUserContact(
    payload: UserIdWithContextIdInputType
  ): Promise<string> {
    const parse_payload = userInputValidators.userIdWithContextIdInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const [deletedContact] = await pgDb
      .delete(userContactsTable)
      .where(
        and(
          eq(userContactsTable.id, parse_payload.id),
          eq(userContactsTable.user_id, parse_payload.user_id)
        )
      )
      .returning({ id: userContactsTable.id });

    if (!deletedContact?.id) {
      throw new ApiError(
        404,
        getSystemCustomErrorMsgByKey("CONTACT_NOT_FOUND")
      );
    }

    return deletedContact.id;
  }

  async deleteUserPhone(
    payload: UserIdWithContextIdInputType
  ): Promise<string> {
    const parse_payload = userInputValidators.userIdWithContextIdInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const [deletedPhone] = await pgDb
      .delete(userPhonesTable)
      .where(
        and(
          eq(userPhonesTable.id, parse_payload.id),
          eq(userPhonesTable.user_id, parse_payload.user_id)
        )
      )
      .returning({ id: userPhonesTable.id });

    if (!deletedPhone?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("PHONE_NOT_FOUND"));
    }

    return deletedPhone.id;
  }

  async deleteUserEmail(
    payload: UserIdWithContextIdInputType
  ): Promise<string> {
    const parse_payload = userInputValidators.userIdWithContextIdInput(payload);
    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const [deletedEmail] = await pgDb
      .delete(userEmailsTable)
      .where(
        and(
          eq(userEmailsTable.id, parse_payload.id),
          eq(userEmailsTable.user_id, parse_payload.user_id)
        )
      )
      .returning({ id: userEmailsTable.id });

    if (!deletedEmail?.id) {
      throw new ApiError(404, getSystemCustomErrorMsgByKey("EMAIL_NOT_FOUND"));
    }

    return deletedEmail.id;
  }

  async deleteUserAddress(
    payload: UserIdWithContextIdInputType
  ): Promise<string> {
    const parse_payload = userInputValidators.userIdWithContextIdInput(payload);

    if (isZodError(parse_payload)) throw validationError(parse_payload);

    const [deletedAddress] = await pgDb
      .delete(userAddressesTable)
      .where(
        and(
          eq(userAddressesTable.id, parse_payload.id),
          eq(userAddressesTable.user_id, parse_payload.user_id)
        )
      )
      .returning({ id: userAddressesTable.id });

    if (!deletedAddress?.id) {
      throw new ApiError(
        404,
        getSystemCustomErrorMsgByKey("ADDRESS_NOT_FOUND")
      );
    }

    return deletedAddress.id;
  }
}

export const userService = new UserService();
