import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

class TokenService {
  generateAccessToken(payload) {
    return jwt.sign(
      {
        ...payload,
        type: "access"
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRES_IN
      }
    );
  }

  generateRefreshToken(payload) {
    return jwt.sign(
      {
        ...payload,
        type: "refresh"
      },
      env.JWT_REFRESH_SECRET,
      {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN
      }
    );
  }

  verifyAccessToken(token) {
    return jwt.verify(token, env.JWT_SECRET);
  }

  verifyRefreshToken(token) {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
  }

  parseExpirationDate(expiresIn) {
    const now = Date.now();

    if (/^\d+$/.test(expiresIn)) {
      return new Date(now + Number(expiresIn) * 1000);
    }

    const match = /^(\d+)([smhd])$/.exec(expiresIn);

    if (!match) {
      throw new Error("Unsupported expiration format");
    }

    const value = Number(match[1]);
    const unit = match[2];
    const multiplier = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000
    }[unit];

    return new Date(now + value * multiplier);
  }
}

export const tokenService = new TokenService();
