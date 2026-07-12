import { z } from "zod";

import { externalIntegrationService } from "../services/external-integration.service.js";

const providerSchema = z.enum(["META", "YOUTUBE"]);
const integrationSyncStateSchema = z.enum(["NOT_CONFIGURED", "READY", "PENDING", "SYNCED", "ERROR"]);
const integrationStatusSchema = z.enum(["INACTIVE", "READY", "ERROR"]);
const publicationSyncStateSchema = z.enum(["PENDING", "SYNCED", "ERROR"]);

const credentialsSchema = z.object({
  clientId: z.string().trim().min(2).max(240).optional(),
  clientSecret: z.string().trim().min(4).max(2000).optional(),
  accessToken: z.string().trim().min(4).max(4000).optional(),
  refreshToken: z.string().trim().min(4).max(4000).optional(),
  tokenExpiresAt: z.string().datetime().optional(),
  scopes: z.array(z.string().trim().min(1).max(120)).optional()
});

const createIntegrationSchema = z.object({
  provider: providerSchema,
  name: z.string().trim().min(2).max(120),
  externalAccountId: z.string().trim().min(1).max(240).optional(),
  externalBusinessId: z.string().trim().min(1).max(240).optional(),
  externalChannelId: z.string().trim().min(1).max(240).optional(),
  credentials: credentialsSchema.optional(),
  syncState: integrationSyncStateSchema.optional(),
  status: integrationStatusSchema.optional(),
  lastSyncAt: z.string().datetime().optional()
});

const listIntegrationSchema = z.object({
  provider: providerSchema.optional(),
  syncState: integrationSyncStateSchema.optional()
});

const updateIntegrationSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    externalAccountId: z.string().trim().min(1).max(240).nullable().optional(),
    externalBusinessId: z.string().trim().min(1).max(240).nullable().optional(),
    externalChannelId: z.string().trim().min(1).max(240).nullable().optional(),
    credentials: credentialsSchema.optional(),
    syncState: integrationSyncStateSchema.optional(),
    status: integrationStatusSchema.optional(),
    lastSyncAt: z.string().datetime().nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed"
  });

const createPublicationLinkSchema = z.object({
  publicationId: z.string().uuid(),
  provider: providerSchema,
  integrationId: z.string().uuid().optional(),
  externalPublicationId: z.string().trim().min(2).max(240),
  externalPermalink: z.string().url().optional(),
  syncState: publicationSyncStateSchema.optional(),
  lastSyncAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

const listPublicationLinkSchema = z.object({
  publicationId: z.string().uuid().optional(),
  provider: providerSchema.optional(),
  syncState: publicationSyncStateSchema.optional()
});

const integrationParamsSchema = z.object({
  integrationId: z.string().uuid()
});

class ExternalIntegrationController {
  async createIntegration(request, response) {
    const payload = createIntegrationSchema.parse(request.body);
    const integration = await externalIntegrationService.createIntegration(request.auth.sub, payload);

    response.status(201).json(integration);
  }

  async listIntegrations(request, response) {
    const filters = listIntegrationSchema.parse(request.query);
    const integrations = await externalIntegrationService.listIntegrations(filters);

    response.status(200).json(integrations);
  }

  async updateIntegration(request, response) {
    const { integrationId } = integrationParamsSchema.parse(request.params);
    const payload = updateIntegrationSchema.parse(request.body);
    const integration = await externalIntegrationService.updateIntegration(request.auth.sub, integrationId, payload);

    response.status(200).json(integration);
  }

  async createPublicationLink(request, response) {
    const payload = createPublicationLinkSchema.parse(request.body);
    const link = await externalIntegrationService.createPublicationLink(request.auth.sub, payload);

    response.status(201).json(link);
  }

  async listPublicationLinks(request, response) {
    const filters = listPublicationLinkSchema.parse(request.query);
    const links = await externalIntegrationService.listPublicationLinks(filters);

    response.status(200).json(links);
  }
}

export const externalIntegrationController = new ExternalIntegrationController();
