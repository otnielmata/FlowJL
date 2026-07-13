import { Router } from "express";

import { discordOperationController } from "../controllers/discord-operation.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const discordOperationRoutes = Router();

discordOperationRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("DISCORD_OPERATION_CREATE")),
  asyncHandler(discordOperationController.create.bind(discordOperationController))
);
discordOperationRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("DISCORD_OPERATION_READ")),
  asyncHandler(discordOperationController.list.bind(discordOperationController))
);
discordOperationRoutes.put(
  "/:operationId",
  authMiddleware,
  asyncHandler(requirePermission("DISCORD_OPERATION_UPDATE")),
  asyncHandler(discordOperationController.update.bind(discordOperationController))
);
discordOperationRoutes.delete(
  "/:operationId",
  authMiddleware,
  asyncHandler(requirePermission("DISCORD_OPERATION_DEACTIVATE")),
  asyncHandler(discordOperationController.deactivate.bind(discordOperationController))
);
