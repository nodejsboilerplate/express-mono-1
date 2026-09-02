import { resendConfig } from "@/config";
import { Resend, type WebhookEventPayload } from "resend";
import type { Request } from "express";
import { ApiError } from "@/libs";
import { getSystemCustomErrorMsgByKey } from "@/events";
import type { WebhookHeadersType } from "@/types";

export class ResendService {
  static resend: Resend | null = null;

  constructor() {
    if (!ResendService.resend) {
      ResendService.resend = new Resend(resendConfig.RESEND_API_KEY);
    }
  }

  getWebhookHeaders(req: Request): WebhookHeadersType {
    const svixId = req.headers["svix-id"] as string;
    const svixTimestamp = req.headers["svix-timestamp"] as string;
    const svixSignature = req.headers["svix-signature"] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("WEBHOOK_HEADERS_MISSING")
      );
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
  ): Promise<WebhookEventPayload> {
    const payload = req.body;
    const { svixId, svixSignature, svixTimestamp } = headers;

    if (!resendConfig.RESEND_WEBHOOK_SECRET) {
      throw new ApiError(
        500,
        getSystemCustomErrorMsgByKey("WEBHOOK_SECRET_NOT_CONFIGURED")
      );
    }

    const result = ResendService.resend?.webhooks.verify({
      headers: {
        id: svixId,
        signature: svixSignature,
        timestamp: svixTimestamp,
      },
      payload,
      webhookSecret: resendConfig.RESEND_WEBHOOK_SECRET,
    });

    if (!result)
      throw new ApiError(
        400,
        getSystemCustomErrorMsgByKey("WEBHOOK_SIGNATURE_INVALID")
      );

    return result;
  }
}
