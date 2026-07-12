import { Router } from "express";

import { assetLibraryController } from "../controllers/asset-library.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const assetLibraryRoutes = Router();

assetLibraryRoutes.post("/", authMiddleware, asyncHandler(requirePermission("ASSET_LIBRARY_CREATE")), asyncHandler(assetLibraryController.create.bind(assetLibraryController)));
assetLibraryRoutes.get("/", authMiddleware, asyncHandler(requirePermission("ASSET_LIBRARY_READ")), asyncHandler(assetLibraryController.list.bind(assetLibraryController)));
assetLibraryRoutes.delete(
  "/:assetId",
  authMiddleware,
  asyncHandler(requirePermission("ASSET_LIBRARY_DEACTIVATE")),
  asyncHandler(assetLibraryController.deactivate.bind(assetLibraryController))
);
