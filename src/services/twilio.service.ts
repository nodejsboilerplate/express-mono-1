import "dotenv/config";
import twilio, { type Twilio } from "twilio";
import type { IdentityMatchParameters } from "twilio/lib/rest/lookups/v2/query";

export enum TwilioMessageTemplates {
  SMS_APPOINTMENT_REMINDERS = "sms_appointment_reminders",
  SMS_ORDER_CONFIRMATION = "sms_order_confirmation",
  SMS_DELIVERY_UPDATES = "sms_delivery_updates",
  SMS_CUSTOMER_SUPPORT = "sms_customer_support",
  SMS_MARKETING_PROMOTIONS = "sms_marketing_promotions",
  SMS_EVENT_NOTIFICATIONS = "sms_event_notifications",
}

export abstract class TwilioService {
  private static ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  private static AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  private static FROM: string = "+17372508034";

  static client: Twilio;

  constructor() {
    if (!TwilioService.client) {
      TwilioService.client = twilio(
        TwilioService.ACCOUNT_SID,
        TwilioService.AUTH_TOKEN
      );
    }
  }

  static ToTwilioDateFormat(date: Date | string | number): string {
    const d = date instanceof Date ? date : new Date(date);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}${month}${day}`;
  }

  protected GetTwilioClient() {
    return TwilioService.client;
  }

  protected async lookupWithCallerNameAndLineTypeIntelligence(number: string) {
    const response = await this.GetTwilioClient()
      .lookups.v2.phoneNumbers(number)
      .fetch({
        fields: "caller_name,line_type_intelligence",
      });

    return response;
  }

  protected async verifyIdentity(
    number: string,
    identity: IdentityMatchParameters
  ) {
    const response = await this.GetTwilioClient()
      .lookups.v2.phoneNumbers(number)
      .fetch({
        fields: "identity_match",
        ...identity,
        dateOfBirth: identity.dateOfBirth
          ? TwilioService.ToTwilioDateFormat(identity.dateOfBirth)
          : undefined,
      });

    return response;
  }

  protected async createMessage(
    to: string,
    body: string,
    from: string = TwilioService.FROM
  ) {
    const message = await this.GetTwilioClient().messages.create({
      body,
      from,
      to,
    });

    return message;
  }
}
