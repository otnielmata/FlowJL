import { Permission } from "../models/permission.model.js";
import { Role } from "../models/role.model.js";
import { allowedRoleCodes, findCatalogRole } from "./role-catalog.js";

function toPublicRole(role) {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    active: role.active
  };
}

function toRolePermissionResponse(role, permissionCodes) {
  return {
    id: role.id,
    code: role.code,
    permissions: permissionCodes
  };
}

class RoleService {
  async list() {
    const roles = await Role.find().sort({ code: 1 });
    return roles.map((role) => toPublicRole(role));
  }

  async create(data) {
    const normalizedCode = data.code.trim().toUpperCase();

    if (!allowedRoleCodes.has(normalizedCode)) {
      throw {
        statusCode: 400,
        message: "Role code is outside the initial catalog"
      };
    }

    const existingRole = await Role.findOne({ code: normalizedCode });

    if (existingRole) {
      throw {
        statusCode: 409,
        message: "A role with this code already exists"
      };
    }

    const catalogRole = findCatalogRole(normalizedCode);
    const role = await Role.create({
      code: normalizedCode,
      name: data.name.trim(),
      description: data.description.trim(),
      active: data.active ?? true,
      permissionIds: catalogRole?.permissionCodes ?? []
    });

    return toPublicRole(role);
  }

  async update(code, data) {
    const normalizedCode = code.trim().toUpperCase();

    if (!allowedRoleCodes.has(normalizedCode)) {
      throw {
        statusCode: 400,
        message: "Role code is outside the initial catalog"
      };
    }

    const role = await Role.findOneAndUpdate(
      { code: normalizedCode },
      {
        name: data.name.trim(),
        description: data.description.trim(),
        active: data.active
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!role) {
      throw {
        statusCode: 404,
        message: "Role not found"
      };
    }

    return toPublicRole(role);
  }

  async getPermissions(code) {
    const normalizedCode = code.trim().toUpperCase();
    const role = await Role.findOne({ code: normalizedCode });

    if (!role) {
      throw {
        statusCode: 404,
        message: "Role not found"
      };
    }

    const permissions = await Permission.find(
      {
        _id: {
          $in: role.permissionIds
        }
      },
      { code: 1 }
    ).sort({ code: 1 });

    return toRolePermissionResponse(role, permissions.map((permission) => permission.code));
  }

  async updatePermissions(code, permissionCodes) {
    const normalizedCode = code.trim().toUpperCase();
    const role = await Role.findOne({ code: normalizedCode });

    if (!role) {
      throw {
        statusCode: 404,
        message: "Role not found"
      };
    }

    const normalizedPermissionCodes = [...new Set(permissionCodes.map((item) => item.trim().toUpperCase()))];
    const permissions = await Permission.find({
      code: {
        $in: normalizedPermissionCodes
      },
      active: true
    }).sort({ code: 1 });

    if (permissions.length !== normalizedPermissionCodes.length) {
      throw {
        statusCode: 400,
        message: "Permission set is invalid"
      };
    }

    role.permissionIds = permissions.map((permission) => permission._id);
    await role.save();

    return toRolePermissionResponse(role, permissions.map((permission) => permission.code));
  }
}

export const roleService = new RoleService();
export { toPublicRole };
