import { Router } from "express";

import { supportTicketController } from "../controllers/support-ticket.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const supportTicketRoutes = Router();

supportTicketRoutes.post(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("SUPPORT_TICKET_CREATE")),
  asyncHandler(supportTicketController.create.bind(supportTicketController))
);
supportTicketRoutes.get(
  "/",
  authMiddleware,
  asyncHandler(requirePermission("SUPPORT_TICKET_READ")),
  asyncHandler(supportTicketController.list.bind(supportTicketController))
);
supportTicketRoutes.get(
  "/:ticketId",
  authMiddleware,
  asyncHandler(requirePermission("SUPPORT_TICKET_READ")),
  asyncHandler(supportTicketController.getById.bind(supportTicketController))
);
supportTicketRoutes.put(
  "/:ticketId",
  authMiddleware,
  asyncHandler(requirePermission("SUPPORT_TICKET_UPDATE")),
  asyncHandler(supportTicketController.update.bind(supportTicketController))
);
supportTicketRoutes.post(
  "/:ticketId/close",
  authMiddleware,
  asyncHandler(requirePermission("SUPPORT_TICKET_UPDATE")),
  asyncHandler(supportTicketController.close.bind(supportTicketController))
);
supportTicketRoutes.delete(
  "/:ticketId",
  authMiddleware,
  asyncHandler(requirePermission("SUPPORT_TICKET_DEACTIVATE")),
  asyncHandler(supportTicketController.deactivate.bind(supportTicketController))
);
