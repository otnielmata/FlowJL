import bcrypt from "bcryptjs";

import { Profile } from "../models/profile.model.js";
import { Role } from "../models/role.model.js";
import { User } from "../models/user.model.js";

export function toPublicUser(user) {
  const roleValue =
    typeof user.roleId === "object" && user.roleId !== null
      ? user.roleId._id?.toString?.() ?? user.roleId.id ?? null
      : user.roleId?.toString?.() ?? user.roleId ?? null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    roleId: roleValue,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    createdBy: user.createdBy ?? null,
    updatedBy: user.updatedBy ?? null,
    lastLoginAt: user.lastLoginAt ?? null,
    deactivatedAt: user.deactivatedAt ?? null
  };
}

class UserService {
  async createBootstrapAdmin(data) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const existingUserWithEmail = await User.findOne({ email: normalizedEmail });

    if (existingUserWithEmail) {
      throw {
        statusCode: 409,
        message: "A user with this email already exists"
      };
    }

    const existingUser = await User.exists({});

    if (existingUser) {
      throw {
        statusCode: 409,
        message: "Initial bootstrap has already been completed"
      };
    }

    const adminRole = await Role.findOne({ code: "ADMIN", active: true });

    if (!adminRole) {
      throw {
        statusCode: 503,
        message: "Core access catalog is not initialized"
      };
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const admin = await User.create({
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash,
      roleId: adminRole._id,
      status: "ACTIVE"
    });

    return toPublicUser(admin);
  }

  async createCollaborator(authenticatedUserId, data) {
    const normalizedEmail = data.email.trim().toLowerCase();
    const existingUserWithEmail = await User.findOne({ email: normalizedEmail });

    if (existingUserWithEmail) {
      throw {
        statusCode: 409,
        message: "A user with this email already exists"
      };
    }

    const role = await Role.findOne({
      _id: data.roleId,
      active: true
    });

    if (!role) {
      throw {
        statusCode: 400,
        message: "Role is invalid or inactive"
      };
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await User.create({
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash,
      roleId: role._id,
      status: "ACTIVE",
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    return toPublicUser(user);
  }

  async getById(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw {
        statusCode: 404,
        message: "User not found"
      };
    }

    return toPublicUser(user);
  }

  async list() {
    const users = await User.find().sort({ createdAt: -1 });

    return users.map((user) => toPublicUser(user));
  }

  async getAuthenticatedUser(userId) {
    return this.getById(userId);
  }

  async update(userId, data) {
    if (data.roleId) {
      const role = await Role.findOne({
        _id: data.roleId,
        active: true
      });

      if (!role) {
        throw {
          statusCode: 400,
          message: "Role is invalid or inactive"
        };
      }
    }

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

    if (data.email) {
      updateData.email = data.email.trim().toLowerCase();
    }

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
      delete updateData.password;
    }

    if (data.status === "INACTIVE") {
      updateData.deactivatedAt = new Date();
    }

    if (data.status === "ACTIVE") {
      updateData.deactivatedAt = null;
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

    return toPublicUser(user);
  }
}

export const userService = new UserService();
