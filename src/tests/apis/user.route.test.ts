import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { userRouter } from "@/routes/user.route";

// ---------------------------------------------------------
// Hoisted shared mock fns
// ---------------------------------------------------------
const mocks = vi.hoisted(() => ({
  authMiddlware: vi.fn(),
  createAddressHandler: vi.fn(),
  createContactHandler: vi.fn(),
  createPhoneHandler: vi.fn(),
  createEmailHandler: vi.fn(),
  getUserProfileHandler: vi.fn(),
  sendContactPhoneVerificationHandler: vi.fn(),
  sendContactEmailVerificationHandler: vi.fn(),
  verifyContactPhoneHandler: vi.fn(),
  verifyContactEmailHandler: vi.fn(),
  updateProfileHandler: vi.fn(),
  updateAddressHandler: vi.fn(),
  updateContactHandler: vi.fn(),
  updatePhoneHandler: vi.fn(),
  updateEmailHandler: vi.fn(),
  deleteUserHandler: vi.fn(),
  deleteAddressHandler: vi.fn(),
  deleteContactHandler: vi.fn(),
  deletePhoneHandler: vi.fn(),
  deleteEmailHandler: vi.fn(),
}));

// Auth middleware: attaches a fixed auth_user and calls next(), so every
// route under test is reachable without exercising real auth logic.
vi.mock("@/middlewares/auth.middleware", () => ({
  authMiddlware: (req: any, res: any, next: any) => {
    mocks.authMiddlware(req, res, next);
    req.auth_user = { id: "auth-user-id" };
    next();
  },
}));

// asyncHandler just needs to await the handler and forward errors to next().
vi.mock("@/utils", () => ({
  asyncHandler:
    (fn: (req: any, res: any, next: any) => unknown) =>
    (req: any, res: any, next: any) =>
      Promise.resolve(fn(req, res, next)).catch(next),
}));

vi.mock("@/controllers/user.controller", () => ({
  UserController: class {
    createAddressHandler = mocks.createAddressHandler;
    createContactHandler = mocks.createContactHandler;
    createPhoneHandler = mocks.createPhoneHandler;
    createEmailHandler = mocks.createEmailHandler;
    getUserProfileHandler = mocks.getUserProfileHandler;
    sendContactPhoneVerificationHandler =
      mocks.sendContactPhoneVerificationHandler;
    sendContactEmailVerificationHandler =
      mocks.sendContactEmailVerificationHandler;
    verifyContactPhoneHandler = mocks.verifyContactPhoneHandler;
    verifyContactEmailHandler = mocks.verifyContactEmailHandler;
    updateProfileHandler = mocks.updateProfileHandler;
    updateAddressHandler = mocks.updateAddressHandler;
    updateContactHandler = mocks.updateContactHandler;
    updatePhoneHandler = mocks.updatePhoneHandler;
    updateEmailHandler = mocks.updateEmailHandler;
    deleteUserHandler = mocks.deleteUserHandler;
    deleteAddressHandler = mocks.deleteAddressHandler;
    deleteContactHandler = mocks.deleteContactHandler;
    deletePhoneHandler = mocks.deletePhoneHandler;
    deleteEmailHandler = mocks.deleteEmailHandler;
  },
}));

const app = express();
app.use(express.json());
app.use("/users", userRouter);

// Every handler responds with which handler ran + the params/body/auth_user
// it received, so each test can assert the router wired the right thing.
const respond = (name: string) =>
  vi.fn((req: any, res: any) =>
    res.status(200).json({
      handler: name,
      params: req.params,
      body: req.body,
      authUserId: req.auth_user?.id,
    })
  );

type RouteCase = {
  method: "get" | "post" | "patch" | "delete";
  path: string;
  handlerKey: keyof typeof mocks;
  handlerName: string;
};

const routes: RouteCase[] = [
  {
    method: "post",
    path: "/users/addresses",
    handlerKey: "createAddressHandler",
    handlerName: "createAddress",
  },
  {
    method: "post",
    path: "/users/contacts",
    handlerKey: "createContactHandler",
    handlerName: "createContact",
  },
  {
    method: "post",
    path: "/users/contacts/c1/phones",
    handlerKey: "createPhoneHandler",
    handlerName: "createPhone",
  },
  {
    method: "post",
    path: "/users/contacts/c1/emails",
    handlerKey: "createEmailHandler",
    handlerName: "createEmail",
  },
  {
    method: "get",
    path: "/users/profile",
    handlerKey: "getUserProfileHandler",
    handlerName: "getUserProfile",
  },
  {
    method: "post",
    path: "/users/messages/contacts/phones/ph1/code",
    handlerKey: "sendContactPhoneVerificationHandler",
    handlerName: "sendContactPhoneVerification",
  },
  {
    method: "post",
    path: "/users/messages/contacts/emails/em1/code",
    handlerKey: "sendContactEmailVerificationHandler",
    handlerName: "sendContactEmailVerification",
  },
  {
    method: "post",
    path: "/users/verify/contacts/phones/ph1",
    handlerKey: "verifyContactPhoneHandler",
    handlerName: "verifyContactPhone",
  },
  {
    method: "post",
    path: "/users/verify/contacts/emails/em1",
    handlerKey: "verifyContactEmailHandler",
    handlerName: "verifyContactEmail",
  },
  {
    method: "patch",
    path: "/users/profile",
    handlerKey: "updateProfileHandler",
    handlerName: "updateProfile",
  },
  {
    method: "patch",
    path: "/users/addresses/addr1",
    handlerKey: "updateAddressHandler",
    handlerName: "updateAddress",
  },
  {
    method: "patch",
    path: "/users/contacts",
    handlerKey: "updateContactHandler",
    handlerName: "updateContact",
  },
  {
    method: "patch",
    path: "/users/contacts/phones/ph1",
    handlerKey: "updatePhoneHandler",
    handlerName: "updatePhone",
  },
  {
    method: "patch",
    path: "/users/contacts/emails/em1",
    handlerKey: "updateEmailHandler",
    handlerName: "updateEmail",
  },
  {
    method: "delete",
    path: "/users",
    handlerKey: "deleteUserHandler",
    handlerName: "deleteUser",
  },
  {
    method: "delete",
    path: "/users/addresses/addr1",
    handlerKey: "deleteAddressHandler",
    handlerName: "deleteAddress",
  },
  {
    method: "delete",
    path: "/users/contacts/c1",
    handlerKey: "deleteContactHandler",
    handlerName: "deleteContact",
  },
  {
    method: "delete",
    path: "/users/contacts/phones/ph1",
    handlerKey: "deletePhoneHandler",
    handlerName: "deletePhone",
  },
  {
    method: "delete",
    path: "/users/contacts/emails/em1",
    handlerKey: "deleteEmailHandler",
    handlerName: "deleteEmail",
  },
];

describe("user.route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const { handlerKey, handlerName } of routes) {
      mocks[handlerKey].mockImplementation(respond(handlerName));
    }
  });

  it.each(routes)(
    "$method $path runs authMiddlware then $handlerKey",
    async ({ method, path, handlerKey, handlerName }) => {
      const res = await request(app)[method](path).send({ some: "payload" });

      expect(mocks.authMiddlware).toHaveBeenCalledTimes(1);
      expect(mocks[handlerKey]).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      expect(res.body.handler).toBe(handlerName);
      // authMiddlware ran before the controller handler, so auth_user is present
      expect(res.body.authUserId).toBe("auth-user-id");

      // every OTHER handler on the router must not have fired for this route
      for (const other of routes) {
        if (other.handlerKey === handlerKey) continue;
        expect(mocks[other.handlerKey]).not.toHaveBeenCalled();
      }
    }
  );

  it("passes route params through to the controller (e.g. :id)", async () => {
    const res = await request(app)
      .post("/users/contacts/my-contact-id/phones")
      .send({});
    expect(res.body.params).toEqual({ id: "my-contact-id" });
  });

  it("passes the parsed JSON body through to the controller", async () => {
    const payload = { addr_name: "Home", city: "Dhaka" };
    const res = await request(app).post("/users/addresses").send(payload);
    expect(res.body.body).toEqual(payload);
  });

  it("returns 404 for an unregistered method on a known path", async () => {
    // PUT is never registered on /addresses/:id (only PATCH/DELETE)
    const res = await request(app).put("/users/addresses/addr1").send({});
    expect(res.status).toBe(404);
  });
});
