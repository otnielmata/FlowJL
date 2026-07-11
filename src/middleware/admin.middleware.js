import { Role } from "../models/role.model.js";
import { User } from "../models/user.model.js";

export async function adminMiddleware(request, _response, next) {
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
    code: "ADMIN",
    active: true
  });

  if (!role) {
    next({
      statusCode: 403,
      message: "Access denied"
    });
    return;
  }

  request.currentUser = authenticatedUser;
  next();
}
