import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";

import { env } from "../config/env.js";
import { AuthSession } from "../models/auth-session.model.js";
import { User } from "../models/user.model.js";
import { auditService } from "./audit.service.js";
import { tokenService } from "./token.service.js";
import { toPublicUser } from "./user.service.js";

async function buildAuthPayload(user, sessionId) {
  const accessToken = tokenService.generateAccessToken({
    sub: user.id,
    email: user.email,
    roleId: user.roleId?._id?.toString?.() ?? user.roleId?.toString?.() ?? null,
    profileId: user.profile?._id?.toString() ?? null,
    sessionId
  });

  const refreshToken = tokenService.generateRefreshToken({
    sub: user.id,
    sessionId
  });

  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    user: {
      ...toPublicUser(user),
      profile: user.profile
        ? {
            id: user.profile._id,
            name: user.profile.name,
            code: user.profile.code
          }
        : null
    }
  };
}

class AuthService {
  async login({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).populate("profile").populate("roleId");

    if (!user) {
      throw {
        statusCode: 401,
        message: "Invalid credentials"
      };
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw {
        statusCode: 401,
        message: "Invalid credentials"
      };
    }

    if (user.status !== "ACTIVE") {
      throw {
        statusCode: 403,
        message: "Access is not allowed"
      };
    }

    user.lastLoginAt = new Date();
    await user.save();

    const sessionId = randomUUID();
    const authPayload = await buildAuthPayload(user, sessionId);

    await AuthSession.create({
      _id: sessionId,
      userId: user.id,
      refreshTokenHash: await bcrypt.hash(authPayload.refreshToken, 10),
      expiresAt: tokenService.parseExpirationDate(env.JWT_REFRESH_EXPIRES_IN)
    });

    await auditService.record({
      actorUserId: user.id,
      action: "USER_AUTHENTICATED",
      targetType: "USER",
      targetId: user.id,
      context: {
        sessionId
      }
    });

    return authPayload;
  }

  async refreshSession({ refreshToken }) {
    let payload;

    try {
      payload = tokenService.verifyRefreshToken(refreshToken);
    } catch (_error) {
      throw {
        statusCode: 401,
        message: "Invalid or expired refresh token"
      };
    }

    if (payload.type !== "refresh") {
      throw {
        statusCode: 401,
        message: "Invalid or expired refresh token"
      };
    }

    const session = await AuthSession.findById(payload.sessionId);

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw {
        statusCode: 401,
        message: "Invalid or expired refresh token"
      };
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, session.refreshTokenHash);

    if (!refreshTokenMatches) {
      throw {
        statusCode: 401,
        message: "Invalid or expired refresh token"
      };
    }

    const user = await User.findById(payload.sub).populate("profile").populate("roleId");

    if (!user || user.status !== "ACTIVE") {
      throw {
        statusCode: 403,
        message: "Access is not allowed"
      };
    }

    const authPayload = await buildAuthPayload(user, session.id);
    session.refreshTokenHash = await bcrypt.hash(authPayload.refreshToken, 10);
    session.lastUsedAt = new Date();
    session.expiresAt = tokenService.parseExpirationDate(env.JWT_REFRESH_EXPIRES_IN);
    await session.save();

    return authPayload;
  }

  async logout({ refreshToken }) {
    let payload;

    try {
      payload = tokenService.verifyRefreshToken(refreshToken);
    } catch (_error) {
      throw {
        statusCode: 401,
        message: "Invalid or expired refresh token"
      };
    }

    if (payload.type !== "refresh") {
      throw {
        statusCode: 401,
        message: "Invalid or expired refresh token"
      };
    }

    const session = await AuthSession.findById(payload.sessionId);

    if (!session || session.revokedAt) {
      throw {
        statusCode: 401,
        message: "Invalid or expired refresh token"
      };
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, session.refreshTokenHash);

    if (!refreshTokenMatches) {
      throw {
        statusCode: 401,
        message: "Invalid or expired refresh token"
      };
    }

    session.revokedAt = new Date();
    session.lastUsedAt = new Date();
    await session.save();

    return {
      message: "Session terminated successfully"
    };
  }

  async getAuthenticatedUser(auth) {
    const user = await User.findById(auth.sub).populate("profile").populate("roleId");

    if (!user) {
      throw {
        statusCode: 404,
        message: "Authenticated user not found"
      };
    }

    return {
      ...toPublicUser(user),
      profile: user.profile
        ? {
            id: user.profile._id,
            name: user.profile.name,
            code: user.profile.code
          }
        : null
    };
  }
}

export const authService = new AuthService();
