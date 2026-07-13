import { Router } from "express";

import { settingsController } from "../controllers/settings.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const settingsRoutes = Router();

settingsRoutes.get(
  "/personal",
  authMiddleware,
  asyncHandler(settingsController.getPersonal.bind(settingsController))
);
settingsRoutes.put(
  "/personal",
  authMiddleware,
  asyncHandler(settingsController.updatePersonal.bind(settingsController))
);
settingsRoutes.get(
  "/admin/overview",
  authMiddleware,
  asyncHandler(settingsController.getAdminOverview.bind(settingsController))
);
settingsRoutes.get(
  "/sections/:sectionKey",
  authMiddleware,
  asyncHandler(settingsController.getSection.bind(settingsController))
);
