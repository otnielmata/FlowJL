import { Permission } from "../models/permission.model.js";
import { Role } from "../models/role.model.js";
import { User } from "../models/user.model.js";

async function userHasPermission(roleId, permissionCode) {
  const role = await Role.findOne({
    _id: roleId,
    active: true
  });

  if (!role) {
    return false;
  }

  const permission = await Permission.findOne({
    _id: {
      $in: role.permissionIds
    },
    code: permissionCode,
    active: true
  });

  return Boolean(permission);
}

export async function requireUserUpdatePermission(request, _response, next) {
  const authenticatedUser = await User.findById(request.auth.sub);

  if (!authenticatedUser || authenticatedUser.status !== "ACTIVE") {
    next({
      statusCode: 401,
      message: "Authenticated user not found"
    });
    return;
  }

  const requestedPermissions = new Set();
  const { roleId, status, name, email, password, profile } = request.body ?? {};

  if (roleId) {
    requestedPermissions.add("USER_CHANGE_ROLE");
  }

  if (status === "ACTIVE") {
    requestedPermissions.add("USER_ACTIVATE");
  }

  if (status === "INACTIVE") {
    requestedPermissions.add("USER_DEACTIVATE");
  }

  if (name || email || password || profile || status === "PENDING") {
    requestedPermissions.add("USER_UPDATE");
  }

  if (requestedPermissions.size === 0) {
    requestedPermissions.add("USER_UPDATE");
  }

  for (const permissionCode of requestedPermissions) {
    const hasPermission = await userHasPermission(authenticatedUser.roleId, permissionCode);

    if (!hasPermission) {
      next({
        statusCode: 403,
        message: "Access denied"
      });
      return;
    }
  }

  request.currentUser = authenticatedUser;
  next();
}
