import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { authRouter } from "@/routes/auth.route";

// ---------------------------------------------------------
// Hoisted shared mock fns
// ---------------------------------------------------------
const mocks = vi.hoisted(() => ({
  authMiddlware: vi.fn(),
  signupUserHandler: vi.fn(),
  loginUserHandler: vi.fn(),
  redirectGoogleAuthHandler: vi.fn(),
  loginWithGoogleHandler: vi.fn(),
  resendSignupCodeHandler: vi.fn(),
  verifySignupCodeHandler: vi.fn(),
  authUserBasicDataProvider: vi.fn(),
}));

// Auth middleware: attaches a fixed auth_user and calls next(), so protected
// routes are reachable without exercising real auth logic.
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

vi.mock("@/controllers/auth.controller", () => ({
  AuthController: class {
    signupUserHandler = mocks.signupUserHandler;
    loginUserHandler = mocks.loginUserHandler;
    redirectGoogleAuthHandler = mocks.redirectGoogleAuthHandler;
    loginWithGoogleHandler = mocks.loginWithGoogleHandler;
    resendSignupCodeHandler = mocks.resendSignupCodeHandler;
    verifySignupCodeHandler = mocks.verifySignupCodeHandler;
    authUserBasicDataProvider = mocks.authUserBasicDataProvider;
  },
}));

const app = express();
app.use(express.json());
app.use("/auth", authRouter);

// Every handler responds with which handler ran + the params/body/query/
// auth_user it received, so each test can assert the router wired the
// right thing (and whether auth actually ran).
const respond = (name: string) =>
  vi.fn((req: any, res: any) =>
    res.status(200).json({
      handler: name,
      params: req.params,
      query: req.query,
      body: req.body,
      authUserId: req.auth_user?.id ?? null,
    })
  );

type RouteCase = {
  method: "get" | "post";
  path: string;
  handlerKey: keyof typeof mocks;
  handlerName: string;
  protected: boolean;
};

const routes: RouteCase[] = [
  {
    method: "post",
    path: "/auth/signup",
    handlerKey: "signupUserHandler",
    handlerName: "signupUser",
    protected: false,
  },
  {
    method: "post",
    path: "/auth/login",
    handlerKey: "loginUserHandler",
    handlerName: "loginUser",
    protected: false,
  },
  {
    method: "get",
    path: "/auth/signin/google",
    handlerKey: "redirectGoogleAuthHandler",
    handlerName: "redirectGoogleAuth",
    protected: false,
  },
  {
    method: "get",
    path: "/auth/callback/google",
    handlerKey: "loginWithGoogleHandler",
    handlerName: "loginWithGoogle",
    protected: false,
  },
  {
    method: "post",
    path: "/auth/messages/signup/code",
    handlerKey: "resendSignupCodeHandler",
    handlerName: "resendSignupCode",
    protected: true,
  },
  {
    method: "post",
    path: "/auth/verify/signup/code",
    handlerKey: "verifySignupCodeHandler",
    handlerName: "verifySignupCode",
    protected: true,
  },
  {
    method: "get",
    path: "/auth/me",
    handlerKey: "authUserBasicDataProvider",
    handlerName: "authUserBasicData",
    protected: true,
  },
];

describe("auth.route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const { handlerKey, handlerName } of routes) {
      mocks[handlerKey].mockImplementation(respond(handlerName));
    }
  });

  it.each(routes)(
    "$method $path routes to $handlerKey (protected=$protected)",
    async ({
      method,
      path,
      handlerKey,
      handlerName,
      protected: isProtected,
    }) => {
      const res = await request(app)[method](path).send({ some: "payload" });

      expect(mocks[handlerKey]).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      expect(res.body.handler).toBe(handlerName);

      if (isProtected) {
        expect(mocks.authMiddlware).toHaveBeenCalledTimes(1);
        expect(res.body.authUserId).toBe("auth-user-id");
      } else {
        expect(mocks.authMiddlware).not.toHaveBeenCalled();
        expect(res.body.authUserId).toBeNull();
      }

      // every OTHER handler on the router must not have fired for this route
      for (const other of routes) {
        if (other.handlerKey === handlerKey) continue;
        expect(mocks[other.handlerKey]).not.toHaveBeenCalled();
      }
    }
  );

  it("passes the auth code through as a query param to the Google callback", async () => {
    const res = await request(app)
      .get("/auth/callback/google")
      .query({ code: "google-auth-code" });
    expect(res.body.query).toEqual({ code: "google-auth-code" });
  });

  it("passes the parsed JSON body through to the login handler", async () => {
    const payload = { identifier: "user@test.com", password: "secret123" };
    const res = await request(app).post("/auth/login").send(payload);
    expect(res.body.body).toEqual(payload);
  });

  it("rejects an unregistered method on a known path with 404", async () => {
    // GET is never registered on /signup (only POST)
    const res = await request(app).get("/auth/signup");
    expect(res.status).toBe(404);
  });
});
