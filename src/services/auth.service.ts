import type { UserSelectType } from "@/database/type";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_EXPIRY_SEC, REFRESH_TOKEN_EXPIRY_SEC } from "./cookie.service";
import { authConfig } from "@/config";
import type { AccessTokenPayload, RefreshTokenPayload } from "@/types";



interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

interface AuthServiceType {
    createTokens(payload: AccessTokenPayload): TokenPair;
    renewAccessToken(payload: AccessTokenPayload, refreshToken: string): string;
    renewRefreshToken(payload: RefreshTokenPayload): string;
}

export class AuthService implements AuthServiceType {
    createTokens(payload: AccessTokenPayload): TokenPair {
        const accessToken = jwt.sign(payload, authConfig.JWT_ACCESS_TOKEN_SECRET, {
            expiresIn: ACCESS_TOKEN_EXPIRY_SEC,
        });

        const refreshToken = jwt.sign(
            payload,
            authConfig.JWT_REFRESH_TOKEN_SECRET,
            { expiresIn: REFRESH_TOKEN_EXPIRY_SEC }
        );

        return { accessToken, refreshToken };
    }

    renewAccessToken(payload: AccessTokenPayload, refreshToken: string): string {
        // const decoded = jwt.verify(refreshToken, authConfig.JWT_REFRESH_TOKEN_SECRET) as { id: string };
        // re-fetch user by decoded.id in caller if you need fresh email/role/username
        return jwt.sign(payload, authConfig.JWT_ACCESS_TOKEN_SECRET, {
            expiresIn: ACCESS_TOKEN_EXPIRY_SEC,
        });
    }

    renewRefreshToken(payload: RefreshTokenPayload): string {
        // const decoded = jwt.verify(refreshToken, authConfig.JWT_REFRESH_TOKEN_SECRET) as { id: string };
        return jwt.sign({ id: payload.id }, authConfig.JWT_REFRESH_TOKEN_SECRET, {
            expiresIn: REFRESH_TOKEN_EXPIRY_SEC,
        });
    }
}