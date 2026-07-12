import bcrypt from "bcryptjs";

import { Profile } from "../models/profile.model.js";
import { Role } from "../models/role.model.js";
import { User } from "../models/user.model.js";
import { auditService } from "./audit.service.js";

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

    await auditService.record({
      actorUserId: null,
      action: "USER_CREATED",
      targetType: "USER",
      targetId: admin.id,
      context: {
        source: "bootstrap-admin",
        status: admin.status,
        roleId: admin.roleId?.toString?.() ?? admin.roleId
      }
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

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "USER_CREATED",
      targetType: "USER",
      targetId: user.id,
      context: {
        status: user.status,
        roleId: user.roleId?.toString?.() ?? user.roleId
      }
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

  async update(authenticatedUserId, userId, data) {
    const currentUser = await User.findById(userId);

    if (!currentUser) {
      throw {
        statusCode: 404,
        message: "User not found"
      };
    }

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

    if (data.email) {
      const normalizedEmail = data.email.trim().toLowerCase();
      const existingUserWithEmail = await User.findOne({
        email: normalizedEmail
      });
      const existingUserId = existingUserWithEmail?.id ?? existingUserWithEmail?._id?.toString?.();

      if (existingUserWithEmail && existingUserId !== currentUser.id) {
        throw {
          statusCode: 409,
          message: "A user with this email already exists"
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
      ...data,
      updatedBy: authenticatedUserId
    };

    if (data.email) {
      updateData.email = data.email.trim().toLowerCase();
    }

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
      delete updateData.password;
    }

    if (data.status === "INACTIVE") {
      if (currentUser.status !== "ACTIVE") {
        throw {
          statusCode: 409,
          message: "User is already inactive"
        };
      }

      if (authenticatedUserId === currentUser.id) {
        throw {
          statusCode: 409,
          message: "You cannot deactivate your own account"
        };
      }

      const adminRole = await Role.findOne({ code: "ADMIN", active: true });
      const currentRoleId = currentUser.roleId?.toString?.() ?? currentUser.roleId;

      if (adminRole && currentRoleId === adminRole._id) {
        const otherActiveAdmins = await User.countDocuments({
          roleId: adminRole._id,
          status: "ACTIVE",
          _id: {
            $ne: currentUser.id
          }
        });

        if (otherActiveAdmins === 0) {
          throw {
            statusCode: 409,
            message: "The last active administrator cannot be deactivated"
          };
        }
      }

      updateData.deactivatedAt = new Date();
    }

    if (data.status === "ACTIVE") {
      if (currentUser.status !== "INACTIVE") {
        throw {
          statusCode: 409,
          message: "User is already active"
        };
      }

      updateData.deactivatedAt = null;
    }

    const currentRoleId = currentUser.roleId?.toString?.() ?? currentUser.roleId;
    const auditEvents = [];

    if (data.roleId && data.roleId !== currentRoleId) {
      updateData.lastRoleChangeAt = new Date();
      updateData.lastRoleChangeBy = authenticatedUserId;
      auditEvents.push({
        actorUserId: authenticatedUserId,
        action: "USER_ROLE_CHANGED",
        targetType: "USER",
        targetId: currentUser.id,
        context: {
          fromRoleId: currentRoleId,
          toRoleId: data.roleId
        }
      });
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true
    }).populate("profile");

    if (data.status === "INACTIVE") {
      auditEvents.push({
        actorUserId: authenticatedUserId,
        action: "USER_DEACTIVATED",
        targetType: "USER",
        targetId: user.id,
        context: {
          status: user.status
        }
      });
    } else {
      auditEvents.push({
        actorUserId: authenticatedUserId,
        action: "USER_UPDATED",
        targetType: "USER",
        targetId: user.id,
        context: {
          fields: Object.keys(data).sort()
        }
      });
    }

    for (const event of auditEvents) {
      await auditService.record(event);
    }

    return toPublicUser(user);
  }
}

export const userService = new UserService();
