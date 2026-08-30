import { resendConfig } from "@/config";
import { Resend, type WebhookEventPayload } from "resend";
import type { Request } from "express";

export type WebhookHeadersType = {
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
};

interface ResendServiceType {
  getWebhookHeaders(req: Request): WebhookHeadersType | null;
  verifyWebhookPayload(
    req: Request,
    headers: WebhookHeadersType
  ): Promise<WebhookEventPayload | null>;
}

export class ResendService implements ResendServiceType {
  private resend: Resend | null = null;
  private static instance: ResendService;

  constructor() {
    this.resend = new Resend(resendConfig.RESEND_API_KEY);
  }

  static create() {
    if (this.instance) {
      return this.instance;
    }

    this.instance = new ResendService();
    return this.instance;
  }

  getResend() {
    return this.resend;
  }

  getWebhookHeaders(req: Request): WebhookHeadersType | null {
    const svixId = req.headers["svix-id"] as string;
    const svixTimestamp = req.headers["svix-timestamp"] as string;
    const svixSignature = req.headers["svix-signature"] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      return null;
    }

    return {
      svixId,
      svixSignature,
      svixTimestamp,
    };
  }

  async verifyWebhookPayload(
    req: Request,
    headers: WebhookHeadersType
  ): Promise<WebhookEventPayload | null> {
    const payload = req.body;
    const { svixId, svixSignature, svixTimestamp } = headers;

    const result = this.resend?.webhooks.verify({
      headers: {
        id: svixId,
        signature: svixSignature,
        timestamp: svixTimestamp,
      },
      payload,
      webhookSecret: resendConfig.RESEND_WEBHOOK_SECRET,
    });

    if (!result) return null;
    return result;
  }
}
