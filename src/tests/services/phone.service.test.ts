import { describe, it, expect, vi, beforeEach } from "vitest";
import { PhoneMessagingService } from "@/services";

// ---------------------------------------------------------
// Hoisted shared mock fns
// ---------------------------------------------------------
const mocks = vi.hoisted(() => ({
  lookupWithCallerNameAndLineTypeIntelligence: vi.fn(),
  createMessage: vi.fn(),
}));

vi.mock("./twilio.service", () => ({
  TwilioService: class {
    lookupWithCallerNameAndLineTypeIntelligence =
      mocks.lookupWithCallerNameAndLineTypeIntelligence;
    createMessage = mocks.createMessage;
  },
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

describe("PhoneMessagingService", () => {
  let phoneMessagingService: PhoneMessagingService;

  beforeEach(() => {
    vi.clearAllMocks();
    phoneMessagingService = new PhoneMessagingService();
  });

  describe("sendContactPhoneVerification", () => {
    it("throws a 400 ApiError when the phone number lookup is invalid", async () => {
      mocks.lookupWithCallerNameAndLineTypeIntelligence.mockResolvedValueOnce({
        valid: false,
      });

      await expect(
        phoneMessagingService.sendContactPhoneVerification(
          "+15551234567",
          "123456"
        )
      ).rejects.toThrow("INVALID_PHONE_NUMBER");

      expect(mocks.createMessage).not.toHaveBeenCalled();
    });

    it("rejects with a 400 status specifically for an invalid number", async () => {
      mocks.lookupWithCallerNameAndLineTypeIntelligence.mockResolvedValueOnce({
        valid: false,
      });

      await expect(
        phoneMessagingService.sendContactPhoneVerification(
          "+15551234567",
          "123456"
        )
      ).rejects.toMatchObject({ status: 400 });
    });

    it("sends the SMS and returns the lookup + message responses when the number is valid", async () => {
      const lookupRespose = {
        valid: true,
        callerName: { caller_name: "Jane" },
      };
      const messageResponse = { sid: "SM123", status: "queued" };

      mocks.lookupWithCallerNameAndLineTypeIntelligence.mockResolvedValueOnce(
        lookupRespose
      );
      mocks.createMessage.mockResolvedValueOnce(messageResponse);

      const result = await phoneMessagingService.sendContactPhoneVerification(
        "+15551234567",
        "654321"
      );

      expect(
        mocks.lookupWithCallerNameAndLineTypeIntelligence
      ).toHaveBeenCalledWith("+15551234567");
      expect(mocks.createMessage).toHaveBeenCalledWith(
        "+15551234567",
        expect.stringContaining("654321")
      );
      expect(mocks.createMessage).toHaveBeenCalledWith(
        "+15551234567",
        expect.stringContaining("expire in 5 minutes")
      );
      expect(result).toEqual({ lookupRespose, messageResponse });
    });
  });
});
