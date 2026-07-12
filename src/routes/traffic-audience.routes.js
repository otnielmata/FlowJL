import { Router } from "express";

import { trafficAudienceController } from "../controllers/traffic-audience.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const trafficAudienceRoutes = Router();

trafficAudienceRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_AUDIENCE_CREATE")),
  asyncHandler(trafficAudienceController.create.bind(trafficAudienceController))
);
trafficAudienceRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_AUDIENCE_READ")),
  asyncHandler(trafficAudienceController.list.bind(trafficAudienceController))
);
trafficAudienceRoutes.put(
  "/:audienceId",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_AUDIENCE_UPDATE")),
  asyncHandler(trafficAudienceController.update.bind(trafficAudienceController))
);
trafficAudienceRoutes.delete(
  "/:audienceId",
  authMiddleware,
  asyncHandler(requirePermission("TRAFFIC_AUDIENCE_DEACTIVATE")),
  asyncHandler(trafficAudienceController.deactivate.bind(trafficAudienceController))
);
