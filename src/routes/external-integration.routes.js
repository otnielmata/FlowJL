import { Router } from "express";

import { externalIntegrationController } from "../controllers/external-integration.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const externalIntegrationRoutes = Router();

externalIntegrationRoutes.post(
  "/integrations",
  authMiddleware,
  asyncHandler(requirePermission("EXTERNAL_INTEGRATION_CREATE")),
  asyncHandler(externalIntegrationController.createIntegration.bind(externalIntegrationController))
);
externalIntegrationRoutes.get(
  "/integrations",
  authMiddleware,
  asyncHandler(requirePermission("EXTERNAL_INTEGRATION_READ")),
  asyncHandler(externalIntegrationController.listIntegrations.bind(externalIntegrationController))
);
externalIntegrationRoutes.put(
  "/integrations/:integrationId",
  authMiddleware,
  asyncHandler(requirePermission("EXTERNAL_INTEGRATION_UPDATE")),
  asyncHandler(externalIntegrationController.updateIntegration.bind(externalIntegrationController))
);
externalIntegrationRoutes.post(
  "/publication-links",
  authMiddleware,
  asyncHandler(requirePermission("EXTERNAL_PUBLICATION_LINK_CREATE")),
  asyncHandler(externalIntegrationController.createPublicationLink.bind(externalIntegrationController))
);
externalIntegrationRoutes.get(
  "/publication-links",
  authMiddleware,
  asyncHandler(requirePermission("EXTERNAL_PUBLICATION_LINK_READ")),
  asyncHandler(externalIntegrationController.listPublicationLinks.bind(externalIntegrationController))
);
