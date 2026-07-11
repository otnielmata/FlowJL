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
}

export const roleService = new RoleService();
export { toPublicRole };
