import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserService } from "@/services";
import { UserInputValidators } from "@/validators/inputs";
import { UserRepository } from "@/database/repositories";

const mocks = vi.hoisted(() => ({
  // repository
  getUserIdByEmail: vi.fn(),
  getUserDataForLogin: vi.fn(),
  createNewUserAndProfile: vi.fn(),
  createNewUserAndProfileByProvider: vi.fn(),
  createNewAddress: vi.fn(),
  createNewContact: vi.fn(),
  createNewPhone: vi.fn(),
  createNewEmail: vi.fn(),
  setPhoneVerifyCode: vi.fn(),
  setEmailVerifyCode: vi.fn(),
  getContactPhoneVerifyDetails: vi.fn(),
  getContactEmailVerifyDetails: vi.fn(),
  getAuthUserProfileById: vi.fn(),
  updateUserProfile: vi.fn(),
  updateContact: vi.fn(),
  updateContactPhone: vi.fn(),
  updateContactEmail: vi.fn(),
  updateAddress: vi.fn(),
  deleteUserById: vi.fn(),
  deleteSingleContact: vi.fn(),
  deleteSingleContactPhone: vi.fn(),
  deleteSingleContactEmail: vi.fn(),
  deleteSingleAddress: vi.fn(),
  // services
  sendContactPhoneVerification: vi.fn(),
  sendContactEmailVerificationCode: vi.fn(),
  // utils
  isZodError: vi.fn(),
  validationError: vi.fn(),
  generateVerificationCode: vi.fn(),
  getVerifyExpiry: vi.fn(),
}));

vi.mock("@/events", () => ({
  getSystemCustomErrorMsgByKey: (key: string) => key,
}));

vi.mock("@/libs", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/utils", () => ({
  generateVerificationCode: mocks.generateVerificationCode,
  getVerifyExpiry: mocks.getVerifyExpiry,
  isZodError: mocks.isZodError,
  validationError: mocks.validationError,
}));

vi.mock("@/validators/inputs", () => ({
  UserInputValidators: class {
    createUserWithProfileInput(p: unknown) {
      return p;
    }
    createUserWithProfileByProviderInput(p: unknown) {
      return p;
    }
    createUserAddressInput(p: unknown) {
      return p;
    }
    createUserContactInput(p: unknown) {
      return p;
    }
    createUserPhoneInput(p: unknown) {
      return p;
    }
    createUserEmailInput(p: unknown) {
      return p;
    }
    userIdWithContextIdInput(p: unknown) {
      return p;
    }
    verifyCodeWithUserId(p: unknown) {
      return p;
    }
    idInput(p: unknown) {
      return p;
    }
    updateUserProfileInput(p: unknown) {
      return p;
    }
    updateUserContactInput(p: unknown) {
      return p;
    }
    updateUserPhoneInput(p: unknown) {
      return p;
    }
    updateUserEmailInput(p: unknown) {
      return p;
    }
    updateUserAddressInput(p: unknown) {
      return p;
    }
  },
}));

vi.mock("@/database/repositories", () => ({
  UserRepository: class {
    GetUserIdByEmail = mocks.getUserIdByEmail;
    GetUserDataForLoginByEmailOrUsernameOrId = mocks.getUserDataForLogin;
    CreateNewUserAndProfile = mocks.createNewUserAndProfile;
    CreateNewUserAndProfileByProvider = mocks.createNewUserAndProfileByProvider;
    CreateNewAddress = mocks.createNewAddress;
    CreateNewContact = mocks.createNewContact;
    CreateNewPhone = mocks.createNewPhone;
    CreateNewEmail = mocks.createNewEmail;
    SetPhoneVerifyCode = mocks.setPhoneVerifyCode;
    SetEmailVerifyCode = mocks.setEmailVerifyCode;
    GetContactPhoneVerifyDetails = mocks.getContactPhoneVerifyDetails;
    GetContactEmailVerifyDetails = mocks.getContactEmailVerifyDetails;
    GetAuthUserProfileById = mocks.getAuthUserProfileById;
    UpdateUserProfile = mocks.updateUserProfile;
    UpdateContact = mocks.updateContact;
    UpdateContactPhone = mocks.updateContactPhone;
    UpdateContactEmail = mocks.updateContactEmail;
    UpdateAddress = mocks.updateAddress;
    DeleteUserById = mocks.deleteUserById;
    DeleteSingleContact = mocks.deleteSingleContact;
    DeleteSingleContactPhone = mocks.deleteSingleContactPhone;
    DeleteSingleContactEmail = mocks.deleteSingleContactEmail;
    DeleteSingleAddress = mocks.deleteSingleAddress;
  },
}));

vi.mock("@/services/phone.message.service", () => ({
  PhoneMessagingService: class {
    sendContactPhoneVerification = mocks.sendContactPhoneVerification;
  },
}));

vi.mock("@/services/email.service", () => ({
  EmailService: class {
    sendContactEmailVerificationCode = mocks.sendContactEmailVerificationCode;
  },
}));

const ApiErrorLike = (status: number, message: string) => {
  const e: any = new Error(message);
  e.status = status;
  return e;
};

describe("UserService", () => {
  let userService: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isZodError.mockReturnValue(false);
    mocks.generateVerificationCode.mockReturnValue("123456");
    const userInputValidators = new UserInputValidators();
    const userRepository = new UserRepository();
    userService = new UserService({
      userInputValidators,
      userRepository,
    });
  });

  // -------------------------------------------------------
  describe("createUserWithProfile", () => {
    const payload = { user: { email: "a@b.com" }, profile: {} };

    it("throws validation error on invalid payload", async () => {
      mocks.isZodError.mockReturnValueOnce(true);
      mocks.validationError.mockReturnValueOnce(
        ApiErrorLike(400, "VALIDATION_ERROR")
      );
      await expect(
        userService.createUserWithProfile(payload as any)
      ).rejects.toThrow("VALIDATION_ERROR");
    });

    it("throws 400 when a user with that email already exists", async () => {
      mocks.getUserIdByEmail.mockResolvedValueOnce({ id: "u1" });
      await expect(
        userService.createUserWithProfile(payload as any)
      ).rejects.toThrow("USER_ALREADY_EXISTS");
    });

    it("creates the user + profile on success", async () => {
      mocks.getUserIdByEmail.mockResolvedValueOnce(undefined);
      mocks.createNewUserAndProfile.mockResolvedValueOnce({
        user: { id: "u1" },
        profile: { id: "p1" },
      });

      const result = await userService.createUserWithProfile(payload as any);
      expect(mocks.createNewUserAndProfile).toHaveBeenCalledWith(payload);
      expect(result).toEqual({ user: { id: "u1" }, profile: { id: "p1" } });
    });
  });

  describe("createUserWithProfileByProvider", () => {
    const payload = { user: { email: "a@b.com" }, profile: {} };

    it("returns the existing user if already registered", async () => {
      mocks.getUserDataForLogin.mockResolvedValueOnce({ id: "u1" });
      const result = await userService.createUserWithProfileByProvider(
        payload as any
      );
      expect(result).toEqual({ id: "u1" });
      expect(mocks.createNewUserAndProfileByProvider).not.toHaveBeenCalled();
    });

    it("creates a new user + profile when none exists", async () => {
      mocks.getUserDataForLogin.mockResolvedValueOnce(undefined);
      mocks.createNewUserAndProfileByProvider.mockResolvedValueOnce({
        id: "u1",
        profile: { id: "p1" },
      });
      const result = await userService.createUserWithProfileByProvider(
        payload as any
      );
      expect(result).toEqual({ id: "u1", profile: { id: "p1" } });
    });
  });

  describe("createUserAddress / createUserContact / createUserPhone / createUserEmail", () => {
    it("createUserAddress returns the new address id", async () => {
      mocks.createNewAddress.mockResolvedValueOnce({ id: "addr1" });
      const result = await userService.createUserAddress({} as any);
      expect(result).toBe("addr1");
    });

    it("createUserAddress throws 500 when creation fails", async () => {
      mocks.createNewAddress.mockResolvedValueOnce(undefined);
      await expect(userService.createUserAddress({} as any)).rejects.toThrow(
        "ADDRESS_CREATION_FAILED"
      );
    });

    it("createUserContact returns the new contact id", async () => {
      mocks.createNewContact.mockResolvedValueOnce({ id: "c1" });
      const result = await userService.createUserContact({} as any);
      expect(result).toBe("c1");
    });

    it("createUserPhone returns the new phone id", async () => {
      mocks.createNewPhone.mockResolvedValueOnce({ id: "ph1" });
      const result = await userService.createUserPhone({} as any);
      expect(result).toBe("ph1");
    });

    it("createUserEmail returns the new email id", async () => {
      mocks.createNewEmail.mockResolvedValueOnce({ id: "em1" });
      const result = await userService.createUserEmail({} as any);
      expect(result).toBe("em1");
    });
  });

  // -------------------------------------------------------
  describe("getUserProfile", () => {
    it("throws 404 when profile not found", async () => {
      mocks.getAuthUserProfileById.mockResolvedValueOnce(undefined);
      await expect(userService.getUserProfile("u1")).rejects.toThrow(
        "USER_NOT_FOUND"
      );
    });

    it("returns the profile on success", async () => {
      mocks.getAuthUserProfileById.mockResolvedValueOnce({
        id: "u1",
        email: "a@b.com",
      });
      const result = await userService.getUserProfile("u1");
      expect(result).toEqual({ id: "u1", email: "a@b.com" });
    });
  });

  // -------------------------------------------------------
  describe("update methods", () => {
    it("updateUserProfile returns the updated profile id", async () => {
      mocks.updateUserProfile.mockResolvedValueOnce({ id: "p1" });
      const result = await userService.updateUserProfile({} as any);
      expect(result).toBe("p1");
    });

    it("updateUserProfile throws 404 when not found", async () => {
      mocks.updateUserProfile.mockResolvedValueOnce(undefined);
      await expect(userService.updateUserProfile({} as any)).rejects.toThrow();
    });

    it("updateUserContact returns the updated contact id", async () => {
      mocks.updateContact.mockResolvedValueOnce({ id: "c1" });
      const result = await userService.updateUserContact({} as any);
      expect(result).toBe("c1");
    });

    it("updateUserContact throws 404 when not found", async () => {
      mocks.updateContact.mockResolvedValueOnce(undefined);
      await expect(userService.updateUserContact({} as any)).rejects.toThrow(
        "CONTACT_NOT_FOUND"
      );
    });

    it("updateUserPhone returns the updated phone id", async () => {
      mocks.updateContactPhone.mockResolvedValueOnce({ id: "ph1" });
      const result = await userService.updateUserPhone({} as any);
      expect(result).toBe("ph1");
    });

    it("updateUserEmail returns the updated email id", async () => {
      mocks.updateContactEmail.mockResolvedValueOnce({ id: "em1" });
      const result = await userService.updateUserEmail({} as any);
      expect(result).toBe("em1");
    });

    it("updateUserAddress returns the updated address id", async () => {
      mocks.updateAddress.mockResolvedValueOnce({ id: "addr1" });
      const result = await userService.updateUserAddress({} as any);
      expect(result).toBe("addr1");
    });

    it("updateUserAddress throws 404 when not found", async () => {
      mocks.updateAddress.mockResolvedValueOnce(undefined);
      await expect(userService.updateUserAddress({} as any)).rejects.toThrow(
        "ADDRESS_NOT_FOUND"
      );
    });
  });

  // -------------------------------------------------------
  describe("delete methods", () => {
    it("deleteUser returns the deleted user id", async () => {
      mocks.deleteUserById.mockResolvedValueOnce({ id: "u1" });
      const result = await userService.deleteUser("u1" as any);
      expect(result).toBe("u1");
    });

    it("deleteUser throws 404 when not found", async () => {
      mocks.deleteUserById.mockResolvedValueOnce(undefined);
      await expect(userService.deleteUser("u1" as any)).rejects.toThrow(
        "USER_NOT_FOUND"
      );
    });

    it("deleteUserContact returns the deleted contact id", async () => {
      mocks.deleteSingleContact.mockResolvedValueOnce({ id: "c1" });
      const result = await userService.deleteUserContact({
        id: "c1",
        user_id: "u1",
      } as any);
      expect(result).toBe("c1");
    });

    it("deleteUserPhone returns the deleted phone id", async () => {
      mocks.deleteSingleContactPhone.mockResolvedValueOnce({ id: "ph1" });
      const result = await userService.deleteUserPhone({
        id: "ph1",
        user_id: "u1",
      } as any);
      expect(result).toBe("ph1");
    });

    it("deleteUserEmail returns the deleted email id", async () => {
      mocks.deleteSingleContactEmail.mockResolvedValueOnce({ id: "em1" });
      const result = await userService.deleteUserEmail({
        id: "em1",
        user_id: "u1",
      } as any);
      expect(result).toBe("em1");
    });

    it("deleteUserAddress returns the deleted address id", async () => {
      mocks.deleteSingleAddress.mockResolvedValueOnce({ id: "addr1" });
      const result = await userService.deleteUserAddress({
        id: "addr1",
        user_id: "u1",
      } as any);
      expect(result).toBe("addr1");
    });

    it("deleteUserAddress throws 404 when not found", async () => {
      mocks.deleteSingleAddress.mockResolvedValueOnce(undefined);
      await expect(
        userService.deleteUserAddress({ id: "addr1", user_id: "u1" } as any)
      ).rejects.toThrow("ADDRESS_NOT_FOUND");
    });
  });
});
