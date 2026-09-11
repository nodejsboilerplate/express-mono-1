import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResendService } from "@/services";

const mocks = vi.hoisted(() => ({
  resendFactory: vi.fn(),
  verify: vi.fn(),
  resendConfig: {
    RESEND_API_KEY: "test-api-key",
    RESEND_WEBHOOK_SECRET: "test-webhook-secret" as string | undefined,
  },
}));

vi.mock("resend", () => ({
  Resend: class {
    webhooks = { verify: mocks.verify };
    constructor(_apiKey: string) {
      mocks.resendFactory(_apiKey);
    }
  },
}));

vi.mock("@/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config")>();
  return {
    ...actual,
    resendConfig: mocks.resendConfig,
  };
});

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

const buildReq = (headers: Record<string, string | undefined>) =>
  ({ headers, body: { some: "payload" } }) as any;

describe("ResendService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ResendService as any).resend = null;
    mocks.resendConfig.RESEND_WEBHOOK_SECRET = "test-webhook-secret";
  });

  describe("constructor / client singleton", () => {
    it("initializes the static Resend client on first instantiation", () => {
      new ResendService();
      expect(mocks.resendFactory).toHaveBeenCalledTimes(1);
      expect(mocks.resendFactory).toHaveBeenCalledWith("test-api-key");
      expect(ResendService.resend).not.toBeNull();
    });

    it("does not re-create the client on subsequent instantiations", () => {
      new ResendService();
      new ResendService();
      new ResendService();
      expect(mocks.resendFactory).toHaveBeenCalledTimes(1);
    });
  });

  describe("GetFullEmail", () => {
    it("formats a title + address into a full From header value", () => {
      const result = ResendService.GetFullEmail("Signup", "auth");
      expect(result).toBe("Signup <auth@fluctux.com>");
    });
  });

  describe("getWebhookHeaders", () => {
    it("returns the parsed svix headers when all are present", () => {
      const service = new ResendService();
      const req = buildReq({
        "svix-id": "id-1",
        "svix-timestamp": "1700000000",
        "svix-signature": "sig-1",
      });

      const result = service.getWebhookHeaders(req);

      expect(result).toEqual({
        svixId: "id-1",
        svixSignature: "sig-1",
        svixTimestamp: "1700000000",
      });
    });

    it.each([["svix-id"], ["svix-timestamp"], ["svix-signature"]])(
      "throws 400 when %s header is missing",
      (missingHeader) => {
        const service = new ResendService();
        const headers: Record<string, string | undefined> = {
          "svix-id": "id-1",
          "svix-timestamp": "1700000000",
          "svix-signature": "sig-1",
        };
        delete headers[missingHeader];

        expect(() => service.getWebhookHeaders(buildReq(headers))).toThrowError(
          expect.objectContaining({ status: 400 })
        );
      }
    );
  });

  describe("verifyWebhookPayload", () => {
    const headers = {
      svixId: "id-1",
      svixSignature: "sig-1",
      svixTimestamp: "1700000000",
    };

    it("throws 500 when RESEND_WEBHOOK_SECRET is not configured", async () => {
      mocks.resendConfig.RESEND_WEBHOOK_SECRET = undefined;
      const service = new ResendService();
      const req = buildReq({});

      await expect(service.verifyWebhookPayload(req, headers)).rejects.toThrow(
        "WEBHOOK_SECRET_NOT_CONFIGURED"
      );
    });

    it("throws 400 when signature verification returns a falsy result", async () => {
      const service = new ResendService();
      mocks.verify.mockReturnValueOnce(undefined);
      const req = buildReq({});

      await expect(service.verifyWebhookPayload(req, headers)).rejects.toThrow(
        "WEBHOOK_SIGNATURE_INVALID"
      );
    });

    it("returns the verified payload and calls webhooks.verify with correct args", async () => {
      const service = new ResendService();
      const verifiedPayload = { type: "email.sent", data: { id: "e1" } };
      mocks.verify.mockReturnValueOnce(verifiedPayload);
      const req = buildReq({});

      const result = await service.verifyWebhookPayload(req, headers);

      expect(mocks.verify).toHaveBeenCalledWith({
        headers: {
          id: "id-1",
          signature: "sig-1",
          timestamp: "1700000000",
        },
        payload: req.body,
        webhookSecret: "test-webhook-secret",
      });
      expect(result).toEqual(verifiedPayload);
    });
  });
});
