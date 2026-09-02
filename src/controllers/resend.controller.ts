import { ApiResponse } from "@/libs";
import { ResendService } from "@/services";
import type { Request, Response } from "express";

const sanitize = (value: unknown): string =>
  String(value ?? "").replace(/[\r\n]/g, "");

const resendService = new ResendService()

export class ResendController {

  async webhook(req: Request, res: Response) {
    const headers = resendService.getWebhookHeaders(req);
    const event = await resendService.verifyWebhookPayload(req, headers);

    // Handle each event according to your business logic.
    switch (event.type) {
      case "email.received":
        console.log("New email from:", sanitize(event.data?.from));
        break;
      case "email.delivered":
        console.log("Email delivered:", sanitize(event.data?.email_id));
        break;
      case "email.bounced":
        console.log("Email bounced:", sanitize(event.data?.email_id));
        break;
    }

    return res.status(200).json(
      new ApiResponse(200, "Ok", {
        received: true,
        type: event.type,
      })
    );
  }
}
