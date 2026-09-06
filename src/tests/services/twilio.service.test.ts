import { describe, it, expect, vi, beforeEach } from "vitest";
import { TwilioService } from "@/services";

// ---------------------------------------------------------
// Hoisted shared mock fns
// ---------------------------------------------------------
const mocks = vi.hoisted(() => ({
  twilioFactory: vi.fn(),
  fetch: vi.fn(),
  create: vi.fn(),
}));

vi.mock("twilio", () => ({
  default: mocks.twilioFactory,
}));

// TwilioService is abstract — expose its protected members via a subclass.
class TestTwilioService extends TwilioService {
  exposeGetTwilioClient() {
    return this.GetTwilioClient();
  }
  exposeLookup(number: string) {
    return this.lookupWithCallerNameAndLineTypeIntelligence(number);
  }
  exposeVerifyIdentity(number: string, identity: any) {
    return this.verifyIdentity(number, identity);
  }
  exposeCreateMessage(to: string, body: string, from?: string) {
    return from
      ? this.createMessage(to, body, from)
      : this.createMessage(to, body);
  }
}

const buildClientStub = () => ({
  lookups: { v2: { phoneNumbers: vi.fn(() => ({ fetch: mocks.fetch })) } },
  messages: { create: mocks.create },
});

describe("TwilioService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // reset the shared static client between tests so the singleton-init
    // behavior can be tested deterministically
    (TwilioService as any).client = undefined;
    mocks.twilioFactory.mockReturnValue(buildClientStub());
  });

  describe("constructor / client singleton", () => {
    it("initializes the static Twilio client on first instantiation", () => {
      new TestTwilioService();
      expect(mocks.twilioFactory).toHaveBeenCalledTimes(1);
    });

    it("does not re-create the client on subsequent instantiations", () => {
      new TestTwilioService();
      new TestTwilioService();
      new TestTwilioService();
      expect(mocks.twilioFactory).toHaveBeenCalledTimes(1);
    });
  });

  describe("ToTwilioDateFormat", () => {
    it("formats a Date instance as YYYYMMDD", () => {
      const date = new Date(2024, 2, 5); // March 5, 2024 (local time)
      expect(TwilioService.ToTwilioDateFormat(date)).toBe("20240305");
    });

    it("formats a date string input", () => {
      expect(TwilioService.ToTwilioDateFormat("2023-01-15T00:00:00")).toBe(
        "20230115"
      );
    });

    it("formats a numeric timestamp input", () => {
      const date = new Date(2022, 10, 20);
      expect(TwilioService.ToTwilioDateFormat(date.getTime())).toBe("20221120");
    });

    it("pads single-digit months and days with a leading zero", () => {
      const date = new Date(2025, 0, 9); // Jan 9, 2025
      expect(TwilioService.ToTwilioDateFormat(date)).toBe("20250109");
    });
  });

  describe("GetTwilioClient", () => {
    it("returns the shared static Twilio client", () => {
      const service = new TestTwilioService();
      expect(service.exposeGetTwilioClient()).toBe(TwilioService.client);
    });
  });

  describe("lookupWithCallerNameAndLineTypeIntelligence", () => {
    it("fetches caller name + line type intelligence for the given number", async () => {
      mocks.fetch.mockResolvedValueOnce({
        valid: true,
        callerName: { caller_name: "Jane" },
      });
      const service = new TestTwilioService();

      const result = await service.exposeLookup("+15551234567");

      expect(mocks.fetch).toHaveBeenCalledWith({
        fields: "caller_name,line_type_intelligence",
      });
      expect(result).toEqual({
        valid: true,
        callerName: { caller_name: "Jane" },
      });
    });
  });

  describe("verifyIdentity", () => {
    it("fetches identity_match with the given identity parameters", async () => {
      mocks.fetch.mockResolvedValueOnce({ valid: true });
      const service = new TestTwilioService();

      const result = await service.exposeVerifyIdentity("+15551234567", {
        firstName: "Jane",
        lastName: "Doe",
      });

      expect(mocks.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: "identity_match",
          firstName: "Jane",
          lastName: "Doe",
        })
      );
      expect(result).toEqual({ valid: true });
    });

    it("converts a provided dateOfBirth to Twilio's YYYYMMDD format", async () => {
      mocks.fetch.mockResolvedValueOnce({ valid: true });
      const service = new TestTwilioService();
      const dob = new Date(1990, 5, 15);

      await service.exposeVerifyIdentity("+15551234567", { dateOfBirth: dob });

      expect(mocks.fetch).toHaveBeenCalledWith(
        expect.objectContaining({ dateOfBirth: "19900615" })
      );
    });

    it("leaves dateOfBirth undefined when not provided", async () => {
      mocks.fetch.mockResolvedValueOnce({ valid: true });
      const service = new TestTwilioService();

      await service.exposeVerifyIdentity("+15551234567", {});

      expect(mocks.fetch).toHaveBeenCalledWith(
        expect.objectContaining({ dateOfBirth: undefined })
      );
    });
  });

  describe("createMessage", () => {
    it("creates a message using the default FROM number when none is provided", async () => {
      mocks.create.mockResolvedValueOnce({ sid: "SM123", status: "queued" });
      const service = new TestTwilioService();

      const result = await service.exposeCreateMessage(
        "+15551234567",
        "Hello there"
      );

      expect(mocks.create).toHaveBeenCalledWith({
        body: "Hello there",
        from: "+17372508034",
        to: "+15551234567",
      });
      expect(result).toEqual({ sid: "SM123", status: "queued" });
    });

    it("uses a custom from number when explicitly provided", async () => {
      mocks.create.mockResolvedValueOnce({ sid: "SM456", status: "queued" });
      const service = new TestTwilioService();

      await service.exposeCreateMessage("+15551234567", "Hi", "+19998887777");

      expect(mocks.create).toHaveBeenCalledWith({
        body: "Hi",
        from: "+19998887777",
        to: "+15551234567",
      });
    });
  });
});
