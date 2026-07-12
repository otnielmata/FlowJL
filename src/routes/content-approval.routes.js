import { Router } from "express";

import { contentApprovalController } from "../controllers/content-approval.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const contentApprovalRoutes = Router();

contentApprovalRoutes.post(
  "/:contentType/:contentId/status",
  authMiddleware,
  asyncHandler(contentApprovalController.changeStatus.bind(contentApprovalController))
);
