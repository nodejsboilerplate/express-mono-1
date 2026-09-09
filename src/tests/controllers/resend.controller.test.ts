import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ResendController } from "@/controllers/resend.controller";

vi.mock("@/services", () => ({ ResendService: class {} }));

vi.mock("@/libs", () => ({
  ApiResponse: class {
    status: number;
    message: string;
    data: unknown;
    success = true;
    title = "";
    constructor(status: number, message: string, data?: unknown) {
      this.status = status;
      this.message = message;
      this.data = data ?? null;
    }
  },
}));

const buildRes = () => {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe("ResendController", () => {
  let resendService: any;
  let resendController: ResendController;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    resendService = {
      getWebhookHeaders: vi.fn(),
      verifyWebhookPayload: vi.fn(),
    };
    resendController = new ResendController({ resendService });
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("verifies the webhook and returns 200 with the event type", async () => {
    resendService.getWebhookHeaders.mockReturnValueOnce({
      svixId: "id-1",
      svixSignature: "sig-1",
      svixTimestamp: "1700000000",
    });
    resendService.verifyWebhookPayload.mockResolvedValueOnce({
      type: "email.delivered",
      data: { email_id: "e1" },
    });
    const req = { headers: {}, body: {} } as any;
    const res = buildRes();

    await resendController.webhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { received: true, type: "email.delivered" },
      })
    );
  });

  it("propagates the error when header/signature verification fails", async () => {
    resendService.getWebhookHeaders.mockImplementationOnce(() => {
      throw new Error("WEBHOOK_HEADERS_MISSING");
    });
    await expect(
      resendController.webhook({ headers: {} } as any, buildRes())
    ).rejects.toThrow("WEBHOOK_HEADERS_MISSING");
  });

  it("does not throw for an unrecognized event type", async () => {
    resendService.getWebhookHeaders.mockReturnValueOnce({} as any);
    resendService.verifyWebhookPayload.mockResolvedValueOnce({
      type: "email.opened",
      data: {},
    });
    const res = buildRes();
    await resendController.webhook({ headers: {}, body: {} } as any, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { received: true, type: "email.opened" },
      })
    );
  });
});
