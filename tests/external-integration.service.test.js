import { beforeEach, describe, expect, it, vi } from "vitest";

const externalIntegrationModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const externalPublicationLinkModel = {
  create: vi.fn(),
  find: vi.fn()
};

const publicationModel = {
  findById: vi.fn()
};

const auditService = {
  record: vi.fn()
};

vi.mock("../src/models/external-integration.model.js", () => ({
  ExternalIntegration: externalIntegrationModel
}));

vi.mock("../src/models/external-publication-link.model.js", () => ({
  ExternalPublicationLink: externalPublicationLinkModel
}));

vi.mock("../src/models/publication.model.js", () => ({
  Publication: publicationModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService
}));

const { externalIntegrationService } = await import("../src/services/external-integration.service.js");

function asDocument(data) {
  return {
    ...data,
    toObject() {
      return this;
    }
  };
}

describe("externalIntegrationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an integration with protected credentials and never returns tokens", async () => {
    externalIntegrationModel.create.mockImplementation(async (payload) => ({
      id: "integration-1",
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      ...payload
    }));

    const result = await externalIntegrationService.createIntegration("user-1", {
      provider: "META",
      name: "Meta JL",
      externalAccountId: "act_123",
      credentials: {
        clientId: "client-123",
        clientSecret: "secret-value",
        accessToken: "token-value",
        scopes: ["pages_manage_posts"]
      }
    });

    expect(externalIntegrationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "META",
        status: "READY",
        syncState: "READY",
        credentials: expect.objectContaining({
          clientId: "client-123",
          clientSecretHash: expect.any(String),
          accessTokenHash: expect.any(String)
        })
      })
    );
    expect(JSON.stringify(result)).not.toContain("secret-value");
    expect(JSON.stringify(result)).not.toContain("token-value");
    expect(result.credentialState).toEqual(
      expect.objectContaining({
        clientIdConfigured: true,
        clientSecretConfigured: true,
        accessTokenConfigured: true
      })
    );
  });

  it("lists integrations without exposing stored hashes", async () => {
    externalIntegrationModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "integration-2",
          provider: "YOUTUBE",
          name: "Canal JL",
          externalAccountId: null,
          externalBusinessId: null,
          externalChannelId: "channel-1",
          credentials: {
            clientId: "client-1",
            clientSecretHash: "stored-secret-hash",
            accessTokenHash: "stored-token-hash",
            refreshTokenHash: null,
            scopes: ["youtube.upload"]
          },
          syncState: "READY",
          status: "READY",
          active: true
        }
      ])
    });

    const result = await externalIntegrationService.listIntegrations({ provider: "YOUTUBE" });

    expect(externalIntegrationModel.find).toHaveBeenCalledWith({
      active: true,
      provider: "YOUTUBE"
    });
    expect(JSON.stringify(result)).not.toContain("stored-secret-hash");
    expect(JSON.stringify(result)).not.toContain("stored-token-hash");
    expect(result[0].credentialState.scopes).toEqual(["youtube.upload"]);
  });

  it("updates integration sync state and keeps credential protection", async () => {
    externalIntegrationModel.findById.mockResolvedValue(
      asDocument({
        id: "integration-3",
        provider: "META",
        name: "Meta antigo",
        credentials: {
          clientId: "client-old",
          clientSecretHash: "hash-old",
          accessTokenHash: null,
          refreshTokenHash: null,
          scopes: []
        },
        externalAccountId: null,
        externalBusinessId: null,
        externalChannelId: null,
        syncState: "READY",
        status: "READY",
        active: true
      })
    );

    const result = await externalIntegrationService.updateIntegration("user-2", "integration-3", {
      name: "Meta novo",
      syncState: "ERROR",
      status: "ERROR",
      credentials: {
        accessToken: "new-token"
      }
    });

    expect(externalIntegrationModel.updateOne).toHaveBeenCalledWith(
      { _id: "integration-3" },
      expect.objectContaining({
        $set: expect.objectContaining({
          name: "Meta novo",
          syncState: "ERROR",
          status: "ERROR",
          credentials: expect.objectContaining({
            clientSecretHash: "hash-old",
            accessTokenHash: expect.any(String)
          })
        })
      })
    );
    expect(JSON.stringify(result)).not.toContain("new-token");
  });

  it("creates an external publication link for an existing publication", async () => {
    publicationModel.findById.mockResolvedValue({
      id: "publication-1",
      launchId: "launch-1",
      contentType: "REEL",
      contentId: "reel-1",
      channel: "INSTAGRAM_REELS",
      status: "PUBLISHED",
      publishAt: new Date("2026-07-22T10:00:00.000Z"),
      active: true
    });
    externalIntegrationModel.findById.mockResolvedValue({
      id: "integration-4",
      provider: "META",
      active: true
    });
    externalPublicationLinkModel.create.mockImplementation(async (payload) => ({
      id: "link-1",
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      ...payload
    }));

    const result = await externalIntegrationService.createPublicationLink("user-3", {
      publicationId: "publication-1",
      provider: "META",
      integrationId: "integration-4",
      externalPublicationId: "meta-post-123",
      externalPermalink: "https://facebook.com/post/123"
    });

    expect(externalPublicationLinkModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        publicationId: "publication-1",
        provider: "META",
        integrationId: "integration-4",
        externalPublicationId: "meta-post-123",
        syncState: "SYNCED"
      })
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "EXTERNAL_PUBLICATION_LINK_CREATED",
        targetId: "link-1"
      })
    );
    expect(result.publication).toEqual(
      expect.objectContaining({
        id: "publication-1",
        status: "PUBLISHED"
      })
    );
  });

  it("rejects publication link when integration provider does not match", async () => {
    publicationModel.findById.mockResolvedValue({
      id: "publication-2",
      active: true
    });
    externalIntegrationModel.findById.mockResolvedValue({
      id: "integration-5",
      provider: "YOUTUBE",
      active: true
    });

    await expect(
      externalIntegrationService.createPublicationLink("user-4", {
        publicationId: "publication-2",
        provider: "META",
        integrationId: "integration-5",
        externalPublicationId: "meta-post-456"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "External integration provider does not match publication link"
    });
  });
});
