import { ApiResponse } from "@/libs";
import { AuthService, CookieService } from "@/services";
import type {
  CreateUserWithProfileInputType,
  EmailZType,
  IdZType,
  LoginUserInputType,
  VerifyCodeInputType,
} from "@/zod";
import type { Request, Response } from "express";

const authService = new AuthService();
export class AuthController {
  async signupUserHandler(req: Request, res: Response): Promise<Response> {
    const payload = req.body as CreateUserWithProfileInputType;
    const result = await authService.signupUser(req, payload);
    const { accessToken, refreshToken } = result.tokens;

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

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          "Account created successfully. Please verify your account using the code sent to you.",
          { id: result.user_id }
        )
      );
  }

  async loginUserHandler(req: Request, res: Response): Promise<Response> {
    const payload = req.body as LoginUserInputType;
    const { accessToken, refreshToken } = await authService.loginUser(payload);

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
    const { email } = req.params as { email: EmailZType };
    const result = await authService.sendSignupCode(email);

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
