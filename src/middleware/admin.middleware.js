import { requirePermission } from "./permission.middleware.js";

export const adminMiddleware = requirePermission("USER_CREATE");
