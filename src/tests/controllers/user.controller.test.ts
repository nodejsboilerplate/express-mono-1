import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserController } from "@/controllers/user.controller";
import { AUTH_USER } from "../helper";

vi.mock("@/libs", () => ({
  ApiResponse: class ApiResponse {
    status: number;
    message: string;
    data: unknown;
    constructor(status: number, message: string, data?: unknown) {
      this.status = status;
      this.message = message;
      this.data = data;
    }
  },
}));

const buildRes = () => {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const buildDeps = () => ({
  userService: {
    createUserAddress: vi.fn(),
    createUserContact: vi.fn(),
    createUserPhone: vi.fn(),
    createUserEmail: vi.fn(),
    getUserProfile: vi.fn(),
    updateUserProfile: vi.fn(),
    updateUserContact: vi.fn(),
    updateUserPhone: vi.fn(),
    updateUserEmail: vi.fn(),
    updateUserAddress: vi.fn(),
    deleteUser: vi.fn(),
    deleteUserAddress: vi.fn(),
    deleteUserContact: vi.fn(),
    deleteUserPhone: vi.fn(),
    deleteUserEmail: vi.fn(),
  },
});

describe("UserController", () => {
  let deps: ReturnType<typeof buildDeps>;
  let userController: UserController;
  let res: ReturnType<typeof buildRes>;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = buildDeps();
    userController = new UserController(deps as any);
    res = buildRes();
  });

  // -------------------------------------------------------
  // Create
  // -------------------------------------------------------
  describe("createAddressHandler", () => {
    it("injects auth_user.id as user_id and returns 201 with the new address id", async () => {
      deps.userService.createUserAddress.mockResolvedValueOnce("addr1");
      const payload = { addr_name: "Home", city: "Dhaka" };
      const req: any = { body: payload, auth_user: AUTH_USER };

      const result = await userController.createAddressHandler(req, res);

      expect(deps.userService.createUserAddress).toHaveBeenCalledWith({
        ...payload,
        user_id: "u1",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 201,
          message: "Address added successfully.",
          data: { id: "addr1" },
        })
      );
      expect(result).toBe(res);
    });
  });

  describe("createContactHandler", () => {
    it("creates a contact scoped to the authenticated user", async () => {
      deps.userService.createUserContact.mockResolvedValueOnce("c1");
      const payload = { socials: [] };
      const req: any = { body: payload, auth_user: AUTH_USER };

      await userController.createContactHandler(req, res);

      expect(deps.userService.createUserContact).toHaveBeenCalledWith({
        ...payload,
        user_id: "u1",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Contact added successfully.",
          data: { id: "c1" },
        })
      );
    });
  });

  describe("createPhoneHandler", () => {
    it("attaches the contact id (from params) and user id (from auth_user)", async () => {
      deps.userService.createUserPhone.mockResolvedValueOnce("ph1");
      const payload = { phone_code: "+880", phone: "1711223344" };
      const req: any = {
        body: payload,
        params: { id: "c1" },
        auth_user: AUTH_USER,
      };

      await userController.createPhoneHandler(req, res);

      expect(deps.userService.createUserPhone).toHaveBeenCalledWith({
        ...payload,
        user_id: "u1",
        contact_id: "c1",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Phone number added successfully.",
          data: { id: "ph1" },
        })
      );
    });
  });

  describe("createEmailHandler", () => {
    it("attaches the contact id (from params) and user id (from auth_user)", async () => {
      deps.userService.createUserEmail.mockResolvedValueOnce("em1");
      const payload = { email: "second@b.com" };
      const req: any = {
        body: payload,
        params: { id: "c1" },
        auth_user: AUTH_USER,
      };

      await userController.createEmailHandler(req, res);

      expect(deps.userService.createUserEmail).toHaveBeenCalledWith({
        ...payload,
        contact_id: "c1",
        user_id: "u1",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Email added successfully.",
          data: { id: "em1" },
        })
      );
    });
  });

  // -------------------------------------------------------
  // Read
  // -------------------------------------------------------
  describe("getUserProfileHandler", () => {
    it("returns the authenticated user's profile", async () => {
      const profile = {
        id: "u1",
        email: "a@b.com",
        profile: { first_name: "Rahim" },
      };
      deps.userService.getUserProfile.mockResolvedValueOnce(profile);
      const req: any = { auth_user: AUTH_USER };

      const result = await userController.getUserProfileHandler(req, res);

      expect(deps.userService.getUserProfile).toHaveBeenCalledWith("u1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Ok", data: profile })
      );
      expect(result).toBe(res);
    });
  });

  // -------------------------------------------------------
  // Update
  // -------------------------------------------------------
  describe("updateProfileHandler", () => {
    it("scopes the update to the authenticated user and returns the updated id", async () => {
      deps.userService.updateUserProfile.mockResolvedValueOnce("p1");
      const payload = { first_name: "New" };
      const req: any = { body: payload, auth_user: AUTH_USER };

      await userController.updateProfileHandler(req, res);

      expect(deps.userService.updateUserProfile).toHaveBeenCalledWith({
        ...payload,
        user_id: "u1",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Profile updated successfully.",
          data: { id: "p1" },
        })
      );
    });
  });

  describe("updateContactHandler", () => {
    it("scopes the update to the authenticated user", async () => {
      deps.userService.updateUserContact.mockResolvedValueOnce("c1");
      const payload = { socials: [] };
      const req: any = { body: payload, auth_user: AUTH_USER };

      await userController.updateContactHandler(req, res);

      expect(deps.userService.updateUserContact).toHaveBeenCalledWith({
        ...payload,
        user_id: "u1",
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Contact updated successfully.",
          data: { id: "c1" },
        })
      );
    });
  });

  describe("updatePhoneHandler", () => {
    it("takes id from params and user_id from auth_user", async () => {
      deps.userService.updateUserPhone.mockResolvedValueOnce("ph1");
      const payload = { phone: "1711223344" };
      const req: any = {
        body: payload,
        params: { id: "ph1" },
        auth_user: AUTH_USER,
      };

      await userController.updatePhoneHandler(req, res);

      expect(deps.userService.updateUserPhone).toHaveBeenCalledWith({
        ...payload,
        id: "ph1",
        user_id: "u1",
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Phone number updated successfully.",
          data: { id: "ph1" },
        })
      );
    });
  });

  describe("updateEmailHandler", () => {
    it("takes id from params and user_id from auth_user", async () => {
      deps.userService.updateUserEmail.mockResolvedValueOnce("em1");
      const payload = { email: "new@b.com" };
      const req: any = {
        body: payload,
        params: { id: "em1" },
        auth_user: AUTH_USER,
      };

      await userController.updateEmailHandler(req, res);

      expect(deps.userService.updateUserEmail).toHaveBeenCalledWith({
        ...payload,
        id: "em1",
        user_id: "u1",
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Email updated successfully.",
          data: { id: "em1" },
        })
      );
    });
  });

  describe("updateAddressHandler", () => {
    it("takes id from params and user_id from auth_user", async () => {
      deps.userService.updateUserAddress.mockResolvedValueOnce("addr1");
      const payload = { city: "Chattogram" };
      const req: any = {
        body: payload,
        params: { id: "addr1" },
        auth_user: AUTH_USER,
      };

      await userController.updateAddressHandler(req, res);

      expect(deps.userService.updateUserAddress).toHaveBeenCalledWith({
        ...payload,
        id: "addr1",
        user_id: "u1",
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Address updated successfully.",
          data: { id: "addr1" },
        })
      );
    });
  });

  // -------------------------------------------------------
  // Delete
  // -------------------------------------------------------
  describe("deleteUserHandler", () => {
    it("deletes the authenticated user's own account", async () => {
      deps.userService.deleteUser.mockResolvedValueOnce("u1");
      const req: any = { auth_user: AUTH_USER };

      const result = await userController.deleteUserHandler(req, res);

      expect(deps.userService.deleteUser).toHaveBeenCalledWith("u1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Account deleted successfully.",
          data: { id: "u1" },
        })
      );
      expect(result).toBe(res);
    });
  });

  describe("deleteAddressHandler", () => {
    it("scopes deletion to id (params) + user_id (auth_user)", async () => {
      deps.userService.deleteUserAddress.mockResolvedValueOnce("addr1");
      const req: any = { params: { id: "addr1" }, auth_user: AUTH_USER };

      await userController.deleteAddressHandler(req, res);

      expect(deps.userService.deleteUserAddress).toHaveBeenCalledWith({
        id: "addr1",
        user_id: "u1",
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Address deleted successfully.",
          data: { id: "addr1" },
        })
      );
    });
  });

  describe("deleteContactHandler", () => {
    it("scopes deletion to id (params) + user_id (auth_user)", async () => {
      deps.userService.deleteUserContact.mockResolvedValueOnce("c1");
      const req: any = { params: { id: "c1" }, auth_user: AUTH_USER };

      await userController.deleteContactHandler(req, res);

      expect(deps.userService.deleteUserContact).toHaveBeenCalledWith({
        id: "c1",
        user_id: "u1",
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Contact deleted successfully.",
          data: { id: "c1" },
        })
      );
    });
  });

  describe("deletePhoneHandler", () => {
    it("scopes deletion to id (params) + user_id (auth_user)", async () => {
      deps.userService.deleteUserPhone.mockResolvedValueOnce("ph1");
      const req: any = { params: { id: "ph1" }, auth_user: AUTH_USER };

      await userController.deletePhoneHandler(req, res);

      expect(deps.userService.deleteUserPhone).toHaveBeenCalledWith({
        id: "ph1",
        user_id: "u1",
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Phone number deleted successfully.",
          data: { id: "ph1" },
        })
      );
    });
  });

  describe("deleteEmailHandler", () => {
    it("scopes deletion to id (params) + user_id (auth_user)", async () => {
      deps.userService.deleteUserEmail.mockResolvedValueOnce("em1");
      const req: any = { params: { id: "em1" }, auth_user: AUTH_USER };

      await userController.deleteEmailHandler(req, res);

      expect(deps.userService.deleteUserEmail).toHaveBeenCalledWith({
        id: "em1",
        user_id: "u1",
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Email deleted successfully.",
          data: { id: "em1" },
        })
      );
    });
  });
});
