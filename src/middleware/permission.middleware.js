import { Permission } from "../models/permission.model.js";
import { Role } from "../models/role.model.js";
import { User } from "../models/user.model.js";

export function requirePermission(permissionCode) {
  return async function permissionMiddleware(request, _response, next) {
    const authenticatedUser = await User.findById(request.auth.sub);

    if (!authenticatedUser || authenticatedUser.status !== "ACTIVE") {
      next({
        statusCode: 401,
        message: "Authenticated user not found"
      });
      return;
    }

    const role = await Role.findOne({
      _id: authenticatedUser.roleId,
      active: true
    });

    if (!role) {
      next({
        statusCode: 403,
        message: "Access denied"
      });
      return;
    }

    const permission = await Permission.findOne({
      _id: {
        $in: role.permissionIds
      },
      code: permissionCode,
      active: true
    });

    if (!permission) {
      next({
        statusCode: 403,
        message: "Access denied"
      });
      return;
    }

    request.currentUser = authenticatedUser;
    request.currentRole = role;
    next();
  };
}
