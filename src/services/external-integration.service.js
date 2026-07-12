import { createHash } from "node:crypto";

import { ExternalIntegration } from "../models/external-integration.model.js";
import { ExternalPublicationLink } from "../models/external-publication-link.model.js";
import { Publication } from "../models/publication.model.js";
import { auditService } from "./audit.service.js";

function normalizeProvider(value) {
  return value.trim().toUpperCase();
}

function normalizeString(value) {
  return value ? value.trim() : null;
}

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function hashSecret(value) {
  return value ? createHash("sha256").update(value).digest("hex") : null;
}

function hasCredential(value) {
  return Boolean(value);
}

function normalizeCredentials(credentials = {}, currentCredentials = {}) {
  return {
    clientId: credentials.clientId !== undefined ? normalizeString(credentials.clientId) : currentCredentials.clientId ?? null,
    clientSecretHash:
      credentials.clientSecret !== undefined
        ? hashSecret(credentials.clientSecret)
        : currentCredentials.clientSecretHash ?? null,
    accessTokenHash:
      credentials.accessToken !== undefined ? hashSecret(credentials.accessToken) : currentCredentials.accessTokenHash ?? null,
    refreshTokenHash:
      credentials.refreshToken !== undefined ? hashSecret(credentials.refreshToken) : currentCredentials.refreshTokenHash ?? null,
    tokenExpiresAt:
      credentials.tokenExpiresAt !== undefined ? normalizeDate(credentials.tokenExpiresAt) : currentCredentials.tokenExpiresAt ?? null,
    scopes: credentials.scopes ?? currentCredentials.scopes ?? []
  };
}

function resolveIntegrationStatus(credentials) {
  const hasAnySecret = credentials.clientSecretHash || credentials.accessTokenHash || credentials.refreshTokenHash;

  if (credentials.clientId && hasAnySecret) {
    return {
      status: "READY",
      syncState: "READY"
    };
  }

  return {
    status: "INACTIVE",
    syncState: "NOT_CONFIGURED"
  };
}

function toPublicIntegration(integration) {
  const credentials = integration.credentials ?? {};

  return {
    id: integration.id,
    provider: integration.provider,
    name: integration.name,
    externalAccountId: integration.externalAccountId ?? null,
    externalBusinessId: integration.externalBusinessId ?? null,
    externalChannelId: integration.externalChannelId ?? null,
    credentialState: {
      clientIdConfigured: hasCredential(credentials.clientId),
      clientSecretConfigured: hasCredential(credentials.clientSecretHash),
      accessTokenConfigured: hasCredential(credentials.accessTokenHash),
      refreshTokenConfigured: hasCredential(credentials.refreshTokenHash),
      tokenExpiresAt: credentials.tokenExpiresAt ?? null,
      scopes: credentials.scopes ?? []
    },
    syncState: integration.syncState,
    status: integration.status,
    lastSyncAt: integration.lastSyncAt ?? null,
    active: integration.active,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt,
    createdBy: integration.createdBy ?? null,
    updatedBy: integration.updatedBy ?? null
  };
}

function toPublicPublicationLink(link, publication = null) {
  return {
    id: link.id,
    publicationId: link.publicationId,
    provider: link.provider,
    integrationId: link.integrationId ?? null,
    externalPublicationId: link.externalPublicationId,
    externalPermalink: link.externalPermalink ?? null,
    syncState: link.syncState,
    lastSyncAt: link.lastSyncAt ?? null,
    metadata: link.metadata ?? {},
    active: link.active,
    publication: publication
      ? {
          id: publication.id,
          launchId: publication.launchId,
          contentType: publication.contentType,
          contentId: publication.contentId,
          channel: publication.channel,
          status: publication.status,
          publishAt: publication.publishAt
        }
      : null,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
    createdBy: link.createdBy ?? null,
    updatedBy: link.updatedBy ?? null
  };
}

async function resolvePublicationOrThrow(publicationId) {
  const publication = await Publication.findById(publicationId);

  if (!publication || !publication.active) {
    throw {
      statusCode: 404,
      message: "Publication not found"
    };
  }

  return publication;
}

async function resolveIntegrationOrThrow(integrationId, provider) {
  if (!integrationId) {
    return null;
  }

  const integration = await ExternalIntegration.findById(integrationId);

  if (!integration || !integration.active) {
    throw {
      statusCode: 404,
      message: "External integration not found"
    };
  }

  if (integration.provider !== provider) {
    throw {
      statusCode: 409,
      message: "External integration provider does not match publication link"
    };
  }

  return integration;
}

class ExternalIntegrationService {
  async createIntegration(authenticatedUserId, data) {
    const provider = normalizeProvider(data.provider);
    const credentials = normalizeCredentials(data.credentials);
    const status = resolveIntegrationStatus(credentials);

    const integration = await ExternalIntegration.create({
      provider,
      name: data.name.trim(),
      externalAccountId: normalizeString(data.externalAccountId),
      externalBusinessId: normalizeString(data.externalBusinessId),
      externalChannelId: normalizeString(data.externalChannelId),
      credentials,
      syncState: data.syncState ?? status.syncState,
      status: data.status ?? status.status,
      lastSyncAt: normalizeDate(data.lastSyncAt),
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "EXTERNAL_INTEGRATION_CREATED",
      targetType: "EXTERNAL_INTEGRATION",
      targetId: integration.id,
      context: {
        provider: integration.provider,
        syncState: integration.syncState,
        status: integration.status
      }
    });

    return toPublicIntegration(integration);
  }

  async listIntegrations(filters = {}) {
    const query = {
      active: true
    };

    if (filters.provider) {
      query.provider = normalizeProvider(filters.provider);
    }

    if (filters.syncState) {
      query.syncState = filters.syncState.trim().toUpperCase();
    }

    const integrations = await ExternalIntegration.find(query).sort({ provider: 1, name: 1 });

    return integrations.map(toPublicIntegration);
  }

  async updateIntegration(authenticatedUserId, integrationId, data) {
    const integration = await ExternalIntegration.findById(integrationId);

    if (!integration || !integration.active) {
      throw {
        statusCode: 404,
        message: "External integration not found"
      };
    }

    const credentials =
      data.credentials !== undefined ? normalizeCredentials(data.credentials, integration.credentials ?? {}) : integration.credentials;
    const resolvedStatus = data.credentials !== undefined ? resolveIntegrationStatus(credentials) : {};
    const updates = {
      name: data.name?.trim() ?? integration.name,
      externalAccountId:
        data.externalAccountId !== undefined ? normalizeString(data.externalAccountId) : integration.externalAccountId ?? null,
      externalBusinessId:
        data.externalBusinessId !== undefined ? normalizeString(data.externalBusinessId) : integration.externalBusinessId ?? null,
      externalChannelId:
        data.externalChannelId !== undefined ? normalizeString(data.externalChannelId) : integration.externalChannelId ?? null,
      credentials,
      syncState: data.syncState ?? resolvedStatus.syncState ?? integration.syncState,
      status: data.status ?? resolvedStatus.status ?? integration.status,
      lastSyncAt: data.lastSyncAt !== undefined ? normalizeDate(data.lastSyncAt) : integration.lastSyncAt ?? null,
      updatedBy: authenticatedUserId
    };

    await ExternalIntegration.updateOne(
      { _id: integrationId },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "EXTERNAL_INTEGRATION_UPDATED",
      targetType: "EXTERNAL_INTEGRATION",
      targetId: integration.id,
      context: {
        provider: integration.provider,
        previousSyncState: integration.syncState,
        syncState: updates.syncState,
        previousStatus: integration.status,
        status: updates.status
      }
    });

    return toPublicIntegration({
      ...integration.toObject(),
      ...updates
    });
  }

  async createPublicationLink(authenticatedUserId, data) {
    const provider = normalizeProvider(data.provider);
    const publication = await resolvePublicationOrThrow(data.publicationId);
    const integration = await resolveIntegrationOrThrow(data.integrationId ?? null, provider);

    const link = await ExternalPublicationLink.create({
      publicationId: publication.id,
      provider,
      integrationId: integration?.id ?? null,
      externalPublicationId: data.externalPublicationId.trim(),
      externalPermalink: normalizeString(data.externalPermalink),
      syncState: data.syncState ?? "SYNCED",
      lastSyncAt: normalizeDate(data.lastSyncAt) ?? new Date(),
      metadata: data.metadata ?? {},
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "EXTERNAL_PUBLICATION_LINK_CREATED",
      targetType: "EXTERNAL_PUBLICATION_LINK",
      targetId: link.id,
      context: {
        publicationId: publication.id,
        provider: link.provider,
        externalPublicationId: link.externalPublicationId,
        integrationId: link.integrationId
      }
    });

    return toPublicPublicationLink(link, publication);
  }

  async listPublicationLinks(filters = {}) {
    const query = {
      active: true
    };

    if (filters.publicationId) {
      query.publicationId = filters.publicationId;
    }

    if (filters.provider) {
      query.provider = normalizeProvider(filters.provider);
    }

    if (filters.syncState) {
      query.syncState = filters.syncState.trim().toUpperCase();
    }

    const links = await ExternalPublicationLink.find(query).sort({ createdAt: -1 });
    const results = [];

    for (const link of links) {
      const publication = await Publication.findById(link.publicationId);
      results.push(toPublicPublicationLink(link, publication));
    }

    return results;
  }
}

export const externalIntegrationService = new ExternalIntegrationService();
