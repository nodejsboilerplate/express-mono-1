import { describe, it, expect, vi, beforeEach } from "vitest";
import { PhoneMessagingService } from "@/services/phone.message.service";

// ---------------------------------------------------------
// Hoisted shared mock fns
// ---------------------------------------------------------
const mocks = vi.hoisted(() => ({
  lookupWithCallerNameAndLineTypeIntelligence: vi.fn(),
  createMessage: vi.fn(),
  isZodError: vi.fn(),
  validationError: vi.fn(),
  generateVerificationCode: vi.fn(),
  getVerifyExpiry: vi.fn(),
}));

// PhoneMessagingService extends TwilioService and constructs it internally
// (super()), so TwilioService is mocked via its real alias (not a relative
// path — this test file doesn't live next to phone.message.service.ts).
vi.mock("@/services/twilio.service", () => ({
  TwilioService: class {
    lookupWithCallerNameAndLineTypeIntelligence =
      mocks.lookupWithCallerNameAndLineTypeIntelligence;
    createMessage = mocks.createMessage;
  },
}));

vi.mock("@/utils", () => ({
  isZodError: mocks.isZodError,
  validationError: mocks.validationError,
  generateVerificationCode: mocks.generateVerificationCode,
  getVerifyExpiry: mocks.getVerifyExpiry,
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

const ApiErrorLike = (status: number, message: string) => {
  const e: any = new Error(message);
  e.status = status;
  return e;
};

// ---------------------------------------------------------
// PhoneMessagingService takes { userInputValidators, userRepository }
// via constructor injection — plain mock objects, no vi.mock() needed
// for either.
// ---------------------------------------------------------
const buildDeps = () => ({
  userInputValidators: {
    userIdWithContextIdInput: vi.fn((p: unknown) => p),
  },
  userRepository: {
    SetPhoneVerifyCode: vi.fn(),
  },
});

describe("PhoneMessagingService", () => {
  let deps: ReturnType<typeof buildDeps>;
  let phoneMessagingService: PhoneMessagingService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isZodError.mockReturnValue(false);
    mocks.generateVerificationCode.mockReturnValue("123456");
    mocks.getVerifyExpiry.mockReturnValue(new Date(Date.now() + 5 * 60_000));
    deps = buildDeps();
    phoneMessagingService = new PhoneMessagingService(deps as any);
  });

  describe("sendContactPhoneVerificationCode", () => {
    const payload = { id: "ph1", user_id: "u1" };

    it("throws validation error on invalid payload", async () => {
      mocks.isZodError.mockReturnValueOnce(true);
      mocks.validationError.mockReturnValueOnce(
        ApiErrorLike(400, "VALIDATION_ERROR")
      );
      await expect(
        phoneMessagingService.sendContactPhoneVerificationCode(payload as any)
      ).rejects.toThrow("VALIDATION_ERROR");
      expect(deps.userRepository.SetPhoneVerifyCode).not.toHaveBeenCalled();
    });

    it("throws 404 when the phone row can't be found/updated", async () => {
      deps.userRepository.SetPhoneVerifyCode.mockResolvedValueOnce(undefined);
      await expect(
        phoneMessagingService.sendContactPhoneVerificationCode(payload as any)
      ).rejects.toThrow("PHONE_NOT_FOUND");
      expect(
        mocks.lookupWithCallerNameAndLineTypeIntelligence
      ).not.toHaveBeenCalled();
    });

    it("throws 400 when the Twilio lookup reports an invalid number", async () => {
      deps.userRepository.SetPhoneVerifyCode.mockResolvedValueOnce({
        id: "ph1",
        phone: "5551234",
        phone_code: "+1",
      });
      mocks.lookupWithCallerNameAndLineTypeIntelligence.mockResolvedValueOnce({
        valid: false,
      });

      await expect(
        phoneMessagingService.sendContactPhoneVerificationCode(payload as any)
      ).rejects.toThrow("INVALID_PHONE_NUMBER");
      expect(mocks.createMessage).not.toHaveBeenCalled();
    });

    it("sends the SMS to the concatenated phone_code+phone on success", async () => {
      deps.userRepository.SetPhoneVerifyCode.mockResolvedValueOnce({
        id: "ph1",
        phone: "5551234567",
        phone_code: "+1",
      });
      mocks.lookupWithCallerNameAndLineTypeIntelligence.mockResolvedValueOnce({
        valid: true,
      });
      mocks.createMessage.mockResolvedValueOnce({
        sid: "SM123",
        status: "queued",
      });

      await phoneMessagingService.sendContactPhoneVerificationCode(
        payload as any
      );

      expect(deps.userRepository.SetPhoneVerifyCode).toHaveBeenCalledWith(
        "123456",
        expect.any(Date),
        "ph1",
        "u1"
      );
      expect(
        mocks.lookupWithCallerNameAndLineTypeIntelligence
      ).toHaveBeenCalledWith("+15551234567");
      expect(mocks.createMessage).toHaveBeenCalledWith(
        "+15551234567",
        expect.stringContaining("123456")
      );
      expect(mocks.createMessage).toHaveBeenCalledWith(
        "+15551234567",
        expect.stringContaining("expire in 5 minutes")
      );
    });
  });
});
