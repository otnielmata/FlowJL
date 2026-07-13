import { Router } from "express";

import { aiAssistantController } from "../controllers/ai-assistant.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const aiAssistantRoutes = Router();

aiAssistantRoutes.post(
  "/conversations",
  authMiddleware,
  asyncHandler(requirePermission("AI_ASSISTANT_WRITE")),
  asyncHandler(aiAssistantController.createConversation.bind(aiAssistantController))
);
aiAssistantRoutes.get(
  "/conversations",
  authMiddleware,
  asyncHandler(requirePermission("AI_ASSISTANT_READ")),
  asyncHandler(aiAssistantController.list.bind(aiAssistantController))
);
aiAssistantRoutes.get(
  "/conversations/:conversationId",
  authMiddleware,
  asyncHandler(requirePermission("AI_ASSISTANT_READ")),
  asyncHandler(aiAssistantController.getById.bind(aiAssistantController))
);
aiAssistantRoutes.post(
  "/conversations/:conversationId/messages",
  authMiddleware,
  asyncHandler(requirePermission("AI_ASSISTANT_WRITE")),
  asyncHandler(aiAssistantController.sendMessage.bind(aiAssistantController))
);
aiAssistantRoutes.post(
  "/messages/:messageId/actions",
  authMiddleware,
  asyncHandler(requirePermission("AI_ASSISTANT_ACTION")),
  asyncHandler(aiAssistantController.runQuickAction.bind(aiAssistantController))
);
