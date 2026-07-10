import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { User } from "../models/user.model.js";

class AuthService {
  async login({ email, password }) {
    const user = await User.findOne({ email: email.toLowerCase(), status: "ACTIVE" })
      .populate("profile")
      .populate("roleId");

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

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        roleId: user.roleId?._id?.toString?.() ?? user.roleId?.toString?.() ?? null,
        profileId: user.profile?._id?.toString() ?? null
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRES_IN
      }
    );

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn: env.JWT_EXPIRES_IN,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        roleId: user.roleId?._id?.toString?.() ?? user.roleId?.toString?.() ?? null,
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
}

export const authService = new AuthService();
