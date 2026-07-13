import { createHash, randomBytes, randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";

import { env } from "../config/env.js";
import { AuthSession } from "../models/auth-session.model.js";
import { PasswordResetRequest } from "../models/password-reset-request.model.js";
import { User } from "../models/user.model.js";
import { auditService } from "./audit.service.js";
import { tokenService } from "./token.service.js";
import { toPublicUser } from "./user.service.js";

const passwordResetExpiresInMinutes = 30;

function createPasswordResetToken() {
  return `${randomUUID()}.${randomBytes(32).toString("hex")}`;
}

function createTokenDigest(token) {
  return createHash("sha256").update(token).digest("hex");
}

function createPasswordResetExpiresAt() {
  return new Date(Date.now() + passwordResetExpiresInMinutes * 60 * 1000);
}

function passwordResetGenericResponse() {
  return {
    message: "If the email is registered, password recovery instructions will be sent"
  };
}

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

  async requestPasswordRecovery({ email }) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      await auditService.record({
        actorUserId: null,
        action: "PASSWORD_RECOVERY_REQUESTED",
        targetType: "USER",
        targetId: "UNKNOWN",
        context: {
          email: normalizedEmail,
          userFound: false
        }
      });

      return passwordResetGenericResponse();
    }

    const resetToken = createPasswordResetToken();

    await PasswordResetRequest.create({
      userId: user.id,
      email: normalizedEmail,
      tokenDigest: createTokenDigest(resetToken),
      tokenHash: await bcrypt.hash(resetToken, 10),
      expiresAt: createPasswordResetExpiresAt(),
      requestedAt: new Date(),
      usedAt: null,
      revokedAt: null,
      usedBy: null
    });

    await auditService.record({
      actorUserId: user.id,
      action: "PASSWORD_RECOVERY_REQUESTED",
      targetType: "USER",
      targetId: user.id,
      context: {
        email: normalizedEmail,
        userFound: true
      }
    });

    return passwordResetGenericResponse();
  }

  async resetPassword({ token, newPassword }) {
    const request = await PasswordResetRequest.findOne({
      tokenDigest: createTokenDigest(token),
      usedAt: null,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    });

    if (!request) {
      throw {
        statusCode: 400,
        message: "Invalid or expired password reset request"
      };
    }

    const tokenMatches = await bcrypt.compare(token, request.tokenHash);

    if (!tokenMatches) {
      throw {
        statusCode: 400,
        message: "Invalid or expired password reset request"
      };
    }

    const user = await User.findById(request.userId);

    if (!user || user.status !== "ACTIVE") {
      throw {
        statusCode: 403,
        message: "Password reset is not allowed"
      };
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.updatedBy = user.id;
    await user.save();

    request.usedAt = new Date();
    request.usedBy = user.id;
    await request.save();

    await auditService.record({
      actorUserId: user.id,
      action: "PASSWORD_RESET_COMPLETED",
      targetType: "USER",
      targetId: user.id,
      context: {
        resetRequestId: request.id
      }
    });

    return {
      message: "Password reset successfully"
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
