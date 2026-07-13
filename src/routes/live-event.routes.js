import { Router } from "express";

import { liveEventController } from "../controllers/live-event.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const liveEventRoutes = Router();

liveEventRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("LIVE_EVENT_CREATE")),
  asyncHandler(liveEventController.create.bind(liveEventController))
);
liveEventRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("LIVE_EVENT_READ")),
  asyncHandler(liveEventController.list.bind(liveEventController))
);
liveEventRoutes.put(
  "/:liveEventId",
  authMiddleware,
  asyncHandler(requirePermission("LIVE_EVENT_UPDATE")),
  asyncHandler(liveEventController.update.bind(liveEventController))
);
liveEventRoutes.delete(
  "/:liveEventId",
  authMiddleware,
  asyncHandler(requirePermission("LIVE_EVENT_DEACTIVATE")),
  asyncHandler(liveEventController.deactivate.bind(liveEventController))
);
