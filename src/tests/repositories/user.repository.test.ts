import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRepository } from "@/database/repositories";

// ---------------------------------------------------------
// Hoisted shared mock fns
// ---------------------------------------------------------
const mocks = vi.hoisted(() => ({
  pgInsert: vi.fn(),
  pgUpdate: vi.fn(),
  pgDelete: vi.fn(),
  pgTransaction: vi.fn(),
  txInsert: vi.fn(),
  txUpdate: vi.fn(),
  getContactPhoneVerifyDetailsExec: vi.fn(),
  getContactEmailVerifyDetailsExec: vi.fn(),
  getUserIdByEmailExec: vi.fn(),
  getAuthUserProfileByIdExec: vi.fn(),
  getUserDataForLoginExec: vi.fn(),
  getUserVerifyDetailsExec: vi.fn(),
  bcryptHash: vi.fn(),
}));

// Routes each `.findFirst(...).prepare(...).execute(...)` call to its own
// controllable mock fn, by call ORDER rather than by the literal string
// passed to `.prepare(name)`. The six prepared statements in
// user.repository.ts are declared once, top-to-bottom, at module load:
//   1. GetContactPhoneVerifyDetails   (userPhonesTable)
//   2. GetContactEmailVerifyDetails   (userEmailsTable)
//   3. GetUserIdByEmail               (usersTable)
//   4. GetAuthUserProfileById         (usersTable)
//   5. GetUserDataForLoginByEmailOrUsernameOrId (usersTable)
//   6. GetUserVerifyDetails           (usersTable)
// Routing by this fixed order is robust to the exact `.prepare("...")`
// string changing, since that order is stable regardless of naming.
vi.mock("@/libs/db.connect", () => {
  const prepareQueue = [
    mocks.getContactPhoneVerifyDetailsExec,
    mocks.getContactEmailVerifyDetailsExec,
    mocks.getUserIdByEmailExec,
    mocks.getAuthUserProfileByIdExec,
    mocks.getUserDataForLoginExec,
    mocks.getUserVerifyDetailsExec,
  ];
  let prepareIndex = 0;

  const tableProxy = {
    findFirst: () => ({
      prepare: () => ({ execute: prepareQueue[prepareIndex++] }),
    }),
  };

  return {
    pgDb: {
      query: {
        userPhonesTable: tableProxy,
        userEmailsTable: tableProxy,
        usersTable: tableProxy,
      },
      insert: mocks.pgInsert,
      update: mocks.pgUpdate,
      delete: mocks.pgDelete,
      transaction: mocks.pgTransaction,
    },
  };
});

vi.mock("bcryptjs", () => ({
  default: { hash: mocks.bcryptHash, compare: vi.fn() },
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

// ---------------------------------------------------------
// Chainable query-builder stub: `.values()/.set()/.where()/.returning()`
// all return the same object, and `await`-ing it resolves to `result`.
// ---------------------------------------------------------
const chain = (result: unknown) => {
  const obj: any = {
    values: vi.fn(() => obj),
    set: vi.fn(() => obj),
    where: vi.fn(() => obj),
    returning: vi.fn(() => obj),
    then: (resolve: any, reject?: any) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return obj;
};

describe("UserRepository", () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pgTransaction.mockImplementation(async (cb: any) =>
      cb({ insert: mocks.txInsert, update: mocks.txUpdate })
    );
    userRepository = new UserRepository();
  });

  // -------------------------------------------------------
  describe("CreateNewUserAndProfile", () => {
    const payload = {
      user: { email: "a@b.com", username: "john", password: "secret123" },
      profile: { first_name: "John", date_of_birth: new Date("1990-01-01") },
    } as any;

    it("hashes the password, creates the user, then the profile, inside a transaction", async () => {
      mocks.txInsert
        .mockReturnValueOnce(chain([{ id: "u1", email: "a@b.com" }])) // usersTable insert
        .mockReturnValueOnce(chain([{ id: "p1", first_name: "John" }])); // profile insert
      mocks.bcryptHash.mockResolvedValueOnce("hashed-pw");
      mocks.txUpdate.mockReturnValueOnce(chain([]));

      const result = await userRepository.CreateNewUserAndProfile(payload);

      expect(mocks.bcryptHash).toHaveBeenCalledWith("secret123", 10);
      expect(mocks.txUpdate).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        user: { id: "u1", email: "a@b.com" },
        profile: { id: "p1", first_name: "John" },
      });
    });

    it("converts date_of_birth to a YYYY-MM-DD string on the profile insert", async () => {
      const profileInsertChain = chain([{ id: "p1" }]);
      mocks.txInsert
        .mockReturnValueOnce(chain([{ id: "u1" }]))
        .mockReturnValueOnce(profileInsertChain);
      mocks.bcryptHash.mockResolvedValueOnce("hashed-pw");
      mocks.txUpdate.mockReturnValueOnce(chain([]));

      await userRepository.CreateNewUserAndProfile(payload);

      expect(profileInsertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ date_of_birth: "1990-01-01", user_id: "u1" })
      );
    });

    it("throws 500 when user creation returns no row", async () => {
      mocks.txInsert.mockReturnValueOnce(chain([]));
      await expect(
        userRepository.CreateNewUserAndProfile(payload)
      ).rejects.toThrow("USER_CREATION_FAILED");
    });

    it("throws 500 when profile creation returns no row", async () => {
      mocks.txInsert
        .mockReturnValueOnce(chain([{ id: "u1" }]))
        .mockReturnValueOnce(chain([]));
      mocks.bcryptHash.mockResolvedValueOnce("hashed-pw");
      mocks.txUpdate.mockReturnValueOnce(chain([]));

      await expect(
        userRepository.CreateNewUserAndProfile(payload)
      ).rejects.toThrow("PROFILE_CREATION_FAILED");
    });
  });

  describe("CreateNewUserAndProfileByProvider", () => {
    const payload = {
      user: { email: "a@b.com", username: "john" },
      profile: { first_name: "John" },
    } as any;

    it("creates the user and profile without touching bcrypt", async () => {
      mocks.txInsert
        .mockReturnValueOnce(chain([{ id: "u1", email: "a@b.com" }]))
        .mockReturnValueOnce(chain([{ id: "p1", first_name: "John" }]));

      const result =
        await userRepository.CreateNewUserAndProfileByProvider(payload);

      expect(mocks.bcryptHash).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: "u1",
        email: "a@b.com",
        profile: { id: "p1", first_name: "John" },
      });
    });

    it("throws 500 when user creation returns no row", async () => {
      mocks.txInsert.mockReturnValueOnce(chain([]));
      await expect(
        userRepository.CreateNewUserAndProfileByProvider(payload)
      ).rejects.toThrow("USER_CREATION_FAILED");
    });
  });

  // -------------------------------------------------------
  describe("simple create wrappers", () => {
    it("CreateNewAddress returns the inserted row", async () => {
      mocks.pgInsert.mockReturnValueOnce(chain([{ id: "addr1" }]));
      const result = await userRepository.CreateNewAddress({} as any);
      expect(result).toEqual({ id: "addr1" });
    });

    it("CreateNewContact returns the inserted row", async () => {
      mocks.pgInsert.mockReturnValueOnce(chain([{ id: "c1" }]));
      const result = await userRepository.CreateNewContact({} as any);
      expect(result).toEqual({ id: "c1" });
    });

    it("CreateNewPhone returns the inserted row", async () => {
      mocks.pgInsert.mockReturnValueOnce(chain([{ id: "ph1" }]));
      const result = await userRepository.CreateNewPhone({} as any);
      expect(result).toEqual({ id: "ph1" });
    });

    it("CreateNewEmail returns the inserted row", async () => {
      mocks.pgInsert.mockReturnValueOnce(chain([{ id: "em1" }]));
      const result = await userRepository.CreateNewEmail({} as any);
      expect(result).toEqual({ id: "em1" });
    });
  });

  // -------------------------------------------------------
  describe("prepared-statement reads", () => {
    it("GetContactPhoneVerifyDetails executes with the phone id", async () => {
      mocks.getContactPhoneVerifyDetailsExec.mockResolvedValueOnce({
        id: "ph1",
        is_verified: false,
      });
      const result = await userRepository.GetContactPhoneVerifyDetails("ph1");
      expect(mocks.getContactPhoneVerifyDetailsExec).toHaveBeenCalledWith({
        phone_id: "ph1",
      });
      expect(result).toEqual({ id: "ph1", is_verified: false });
    });

    it("GetContactEmailVerifyDetails executes with the email row id", async () => {
      mocks.getContactEmailVerifyDetailsExec.mockResolvedValueOnce({
        id: "em1",
        is_verified: false,
      });
      const result = await userRepository.GetContactEmailVerifyDetails("em1");
      expect(mocks.getContactEmailVerifyDetailsExec).toHaveBeenCalledWith({
        email_table_id: "em1",
      });
      expect(result).toEqual({ id: "em1", is_verified: false });
    });

    it("GetUserIdByEmail executes with the email", async () => {
      mocks.getUserIdByEmailExec.mockResolvedValueOnce({ id: "u1" });
      const result = await userRepository.GetUserIdByEmail("a@b.com");
      expect(mocks.getUserIdByEmailExec).toHaveBeenCalledWith({
        email: "a@b.com",
      });
      expect(result).toEqual({ id: "u1" });
    });

    it("GetAuthUserProfileById executes with the user id", async () => {
      mocks.getAuthUserProfileByIdExec.mockResolvedValueOnce({
        id: "u1",
        email: "a@b.com",
      });
      const result = await userRepository.GetAuthUserProfileById("u1");
      expect(mocks.getAuthUserProfileByIdExec).toHaveBeenCalledWith({
        id: "u1",
      });
      expect(result).toEqual({ id: "u1", email: "a@b.com" });
    });

    it("GetUserDataForLoginByEmailOrUsernameOrId executes with the identifier", async () => {
      mocks.getUserDataForLoginExec.mockResolvedValueOnce({
        id: "u1",
        email: "a@b.com",
      });
      const result =
        await userRepository.GetUserDataForLoginByEmailOrUsernameOrId(
          "a@b.com"
        );
      expect(mocks.getUserDataForLoginExec).toHaveBeenCalledWith({
        data: "a@b.com",
      });
      expect(result).toEqual({ id: "u1", email: "a@b.com" });
    });

    it("GetUserVerifyDetails executes with the user id", async () => {
      mocks.getUserVerifyDetailsExec.mockResolvedValueOnce({
        id: "u1",
        is_verified: false,
      });
      const result = await userRepository.GetUserVerifyDetails("u1");
      expect(mocks.getUserVerifyDetailsExec).toHaveBeenCalledWith({
        user_id: "u1",
      });
      expect(result).toEqual({ id: "u1", is_verified: false });
    });
  });

  // -------------------------------------------------------
  describe("updates", () => {
    it("UpdateUserProfile converts date_of_birth and strips user_id/id from the SET clause", async () => {
      const updateChain = chain([{ id: "p1" }]);
      mocks.pgUpdate.mockReturnValueOnce(updateChain);

      const result = await userRepository.UpdateUserProfile({
        id: "p1",
        user_id: "u1",
        first_name: "New",
        date_of_birth: new Date("1992-05-05"),
      } as any);

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: "New",
          date_of_birth: "1992-05-05",
        })
      );
      expect(updateChain.set).not.toHaveBeenCalledWith(
        expect.objectContaining({ user_id: expect.anything() })
      );
      expect(result).toEqual({ id: "p1" });
    });

    it("UpdateUserProfile leaves date_of_birth undefined when not provided", async () => {
      const updateChain = chain([{ id: "p1" }]);
      mocks.pgUpdate.mockReturnValueOnce(updateChain);

      await userRepository.UpdateUserProfile({
        id: "p1",
        user_id: "u1",
        first_name: "New",
      } as any);

      expect(updateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ date_of_birth: undefined })
      );
    });

    it("UpdateContact returns the updated row", async () => {
      mocks.pgUpdate.mockReturnValueOnce(chain([{ id: "c1" }]));
      const result = await userRepository.UpdateContact({
        user_id: "u1",
      } as any);
      expect(result).toEqual({ id: "c1" });
    });

    it("UpdateUserVerifyDetails clears verify_code/expiry and marks verified", async () => {
      const updateChain = chain([{ id: "u1" }]);
      mocks.pgUpdate.mockReturnValueOnce(updateChain);

      const result = await userRepository.UpdateUserVerifyDetails("u1");

      expect(updateChain.set).toHaveBeenCalledWith({
        is_verified: true,
        verify_code: null,
        verify_expiry: null,
      });
      expect(result).toEqual({ id: "u1" });
    });

    it("UpdateContactPhone returns the updated row", async () => {
      mocks.pgUpdate.mockReturnValueOnce(chain([{ id: "ph1" }]));
      const result = await userRepository.UpdateContactPhone({
        id: "ph1",
        user_id: "u1",
      } as any);
      expect(result).toEqual({ id: "ph1" });
    });

    it("UpdateContactEmail returns the updated row", async () => {
      mocks.pgUpdate.mockReturnValueOnce(chain([{ id: "em1" }]));
      const result = await userRepository.UpdateContactEmail({
        id: "em1",
        user_id: "u1",
      } as any);
      expect(result).toEqual({ id: "em1" });
    });

    it("UpdateAddress returns the updated row", async () => {
      mocks.pgUpdate.mockReturnValueOnce(chain([{ id: "addr1" }]));
      const result = await userRepository.UpdateAddress({
        id: "addr1",
        user_id: "u1",
      } as any);
      expect(result).toEqual({ id: "addr1" });
    });
  });

  // -------------------------------------------------------
  describe("verification code setters", () => {
    it("SetPhoneVerifyCode returns id/phone/phone_code", async () => {
      mocks.pgUpdate.mockReturnValueOnce(
        chain([{ id: "ph1", phone: "5551234", phone_code: "+1" }])
      );
      const result = await userRepository.SetPhoneVerifyCode(
        "123456",
        new Date(),
        "ph1",
        "u1"
      );
      expect(result).toEqual({ id: "ph1", phone: "5551234", phone_code: "+1" });
    });

    it("SetEmailVerifyCode returns id/email", async () => {
      mocks.pgUpdate.mockReturnValueOnce(
        chain([{ id: "em1", email: "a@b.com" }])
      );
      const result = await userRepository.SetEmailVerifyCode(
        "123456",
        new Date(),
        "em1",
        "u1"
      );
      expect(result).toEqual({ id: "em1", email: "a@b.com" });
    });

    it("SetVerifyCodeForCoreUser returns the user id", async () => {
      mocks.pgUpdate.mockReturnValueOnce(chain([{ id: "u1" }]));
      const result = await userRepository.SetVerifyCodeForCoreUser(
        "123456",
        new Date(),
        "a@b.com"
      );
      expect(result).toEqual({ id: "u1" });
    });
  });

  // -------------------------------------------------------
  describe("deletes", () => {
    it("DeleteUserById returns the deleted user id", async () => {
      mocks.pgDelete.mockReturnValueOnce(chain([{ id: "u1" }]));
      const result = await userRepository.DeleteUserById("u1");
      expect(result).toEqual({ id: "u1" });
    });

    it("DeleteSingleContact returns the deleted contact id", async () => {
      mocks.pgDelete.mockReturnValueOnce(chain([{ id: "c1" }]));
      const result = await userRepository.DeleteSingleContact("c1", "u1");
      expect(result).toEqual({ id: "c1" });
    });

    it("DeleteSingleContactPhone returns the deleted phone id", async () => {
      mocks.pgDelete.mockReturnValueOnce(chain([{ id: "ph1" }]));
      const result = await userRepository.DeleteSingleContactPhone("ph1", "u1");
      expect(result).toEqual({ id: "ph1" });
    });

    it("DeleteSingleContactEmail returns the deleted email id", async () => {
      mocks.pgDelete.mockReturnValueOnce(chain([{ id: "em1" }]));
      const result = await userRepository.DeleteSingleContactEmail("em1", "u1");
      expect(result).toEqual({ id: "em1" });
    });

    it("DeleteSingleAddress returns the deleted address id", async () => {
      mocks.pgDelete.mockReturnValueOnce(chain([{ id: "addr1" }]));
      const result = await userRepository.DeleteSingleAddress("addr1", "u1");
      expect(result).toEqual({ id: "addr1" });
    });
  });
});
