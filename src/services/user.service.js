import bcrypt from "bcryptjs";

import { env } from "../config/env.js";
import { Profile } from "../models/profile.model.js";
import { User } from "../models/user.model.js";

class UserService {
  async ensureDefaultAdmin() {
    const existingAdmin = await User.findOne({ email: env.DEFAULT_ADMIN_EMAIL.toLowerCase() });

    if (existingAdmin) {
      return existingAdmin;
    }

    const password = await bcrypt.hash(env.DEFAULT_ADMIN_PASSWORD, 10);

    const admin = await User.create({
      name: env.DEFAULT_ADMIN_NAME,
      email: env.DEFAULT_ADMIN_EMAIL.toLowerCase(),
      password
    });

    return admin;
  }

  async update(userId, data) {
    if (data.profile) {
      const profile = await Profile.findById(data.profile);

      if (!profile || !profile.active) {
        throw {
          statusCode: 400,
          message: "Profile is invalid or inactive"
        };
      }
    }

    const updateData = {
      ...data
    };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true
    }).populate("profile");

    if (!user) {
      throw {
        statusCode: 404,
        message: "User not found"
      };
    }

    return user;
  }
}

export const userService = new UserService();
