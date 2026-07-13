import { Router } from "express";

import { platformSettingController } from "../controllers/platform-setting.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const platformSettingRoutes = Router();

platformSettingRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("PLATFORM_SETTING_READ")),
  asyncHandler(platformSettingController.list.bind(platformSettingController))
);
platformSettingRoutes.put(
  "/:key",
  authMiddleware,
  asyncHandler(requirePermission("PLATFORM_SETTING_UPDATE")),
  asyncHandler(platformSettingController.update.bind(platformSettingController))
);
