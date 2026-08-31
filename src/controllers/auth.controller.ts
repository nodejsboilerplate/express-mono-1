import { ApiResponse } from "@/libs";
import {  authService, CookieService } from "@/services";
import type { IdZType, LoginUserInputType, VerifyCodeInputType } from "@/zod";
import type { Request, Response } from "express";

export class AuthController {
 
  async loginUserHandler(req: Request, res: Response): Promise<Response> {
    const payload = req.body as LoginUserInputType;
    const { accessToken, refreshToken } =
      await authService.loginUser(payload);

    res.cookie(
      CookieService.ACCESS_TOKEN.name,
      accessToken,
      CookieService.ACCESS_TOKEN.cookie
    );

    res.cookie(
      CookieService.REFRESH_TOKEN.name,
      refreshToken,
      CookieService.REFRESH_TOKEN.cookie
    );

    return res.status(200).json(new ApiResponse(200, "Login Successful."));
  }

  async sendSignupCodeHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: IdZType };
    const result = await authService.sendSignupCode(id);

    return res.status(200).json(
      new ApiResponse(200, "Verification code sent successfully.", {
        id: result,
      })
    );
  }

  async verifySignupCodeHandler(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params as Pick<VerifyCodeInputType, "id">;
    const { verify_code } = req.body as Pick<
      VerifyCodeInputType,
      "verify_code"
    >;

    const result = await authService.verifySignupCode({ verify_code, id });

    return res.status(200).json(
      new ApiResponse(200, "Account verified successfully.", {
        id: result,
      })
    );
  }
}
