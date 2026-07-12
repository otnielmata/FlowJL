import { beforeEach, describe, expect, it, vi } from "vitest";

const trafficAudienceModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const trafficCampaignModel = {
  findById: vi.fn()
};

const launchModel = {
  findById: vi.fn()
};

const auditService = {
  record: vi.fn()
};

vi.mock("../src/models/traffic-audience.model.js", () => ({
  TrafficAudience: trafficAudienceModel
}));

vi.mock("../src/models/traffic-campaign.model.js", () => ({
  TrafficCampaign: trafficCampaignModel
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService
}));

const { trafficAudienceService } = await import("../src/services/traffic-audience.service.js");

function asDocument(data) {
  return {
    ...data,
    toObject() {
      return this;
    }
  };
}

describe("trafficAudienceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a segmented audience from a valid campaign", async () => {
    trafficCampaignModel.findById.mockResolvedValue({
      id: "campaign-1",
      launchId: "launch-1",
      active: true
    });
    launchModel.findById.mockResolvedValue({
      id: "launch-1",
      active: true
    });
    trafficAudienceModel.create.mockImplementation(async (payload) => ({
      id: "audience-1",
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      ...payload
    }));

    const result = await trafficAudienceService.create("user-1", {
      campaignIds: ["campaign-1"],
      name: "Lookalike compradores",
      objective: "Escalar conversoes",
      strategy: "Usar base de compradores recentes",
      segmentationCriteria: {
        interests: ["Marketing", "Marketing"],
        locations: ["Brasil"],
        lookalikeSource: "buyers-180d"
      },
      status: "ACTIVE"
    });

    expect(trafficAudienceModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        launchId: "launch-1",
        campaignIds: ["campaign-1"],
        name: "Lookalike compradores",
        objective: "Escalar conversoes",
        strategy: "Usar base de compradores recentes",
        segmentationCriteria: expect.objectContaining({
          interests: ["Marketing"],
          locations: ["Brasil"],
          lookalikeSource: "buyers-180d"
        }),
        status: "ACTIVE",
        active: true
      })
    );
    expect(result.history[0]).toEqual(
      expect.objectContaining({
        action: "CREATED",
        toStatus: "ACTIVE",
        campaignIdsSnapshot: ["campaign-1"]
      })
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "TRAFFIC_AUDIENCE_CREATED",
        targetId: "audience-1"
      })
    );
  });

  it("creates a manual audience directly from a valid launch", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-2",
      active: true
    });
    trafficAudienceModel.create.mockImplementation(async (payload) => ({
      id: "audience-2",
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      ...payload
    }));

    const result = await trafficAudienceService.create("user-2", {
      launchId: "launch-2",
      name: "Topo frio",
      objective: "Validar interesse",
      strategy: "Segmentacao por interesses amplos",
      segmentationCriteria: {
        interests: ["Empreendedorismo"]
      }
    });

    expect(trafficCampaignModel.findById).not.toHaveBeenCalled();
    expect(result.launchId).toBe("launch-2");
    expect(result.status).toBe("DRAFT");
  });

  it("rejects creation without launch or campaign context", async () => {
    await expect(
      trafficAudienceService.create("user-1", {
        name: "Sem contexto",
        objective: "Gerar leads",
        strategy: "Interesses",
        segmentationCriteria: {
          interests: ["Marketing"]
        }
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Traffic audience requires a launch or campaign context"
    });
  });

  it("rejects creation without minimum segmentation criteria", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-3",
      active: true
    });

    await expect(
      trafficAudienceService.create("user-1", {
        launchId: "launch-3",
        name: "Publico vazio",
        objective: "Gerar leads",
        strategy: "Interesses",
        segmentationCriteria: {}
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Traffic audience requires at least one segmentation criterion"
    });
  });

  it("rejects campaign links that do not belong to the informed launch", async () => {
    trafficCampaignModel.findById.mockResolvedValue({
      id: "campaign-4",
      launchId: "launch-other",
      active: true
    });

    await expect(
      trafficAudienceService.create("user-1", {
        launchId: "launch-4",
        campaignIds: ["campaign-4"],
        name: "Publico",
        objective: "Gerar leads",
        strategy: "Interesses",
        segmentationCriteria: {
          interests: ["Marketing"]
        }
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Audience campaigns must belong to the informed launch"
    });
  });

  it("updates strategy, status and segmentation with audit history", async () => {
    trafficAudienceModel.findById.mockResolvedValue(
      asDocument({
        id: "audience-5",
        launchId: "launch-5",
        campaignIds: ["campaign-old"],
        name: "Topo",
        objective: "Gerar leads",
        strategy: "Interesses antigos",
        segmentationCriteria: {
          interests: ["Marketing"],
          demographics: [],
          behaviors: [],
          locations: [],
          exclusions: [],
          lookalikeSource: null,
          customRules: []
        },
        status: "DRAFT",
        history: [],
        active: true
      })
    );
    trafficCampaignModel.findById.mockResolvedValue({
      id: "campaign-new",
      launchId: "launch-5",
      active: true
    });

    const result = await trafficAudienceService.update("user-5", "audience-5", {
      campaignIds: ["campaign-new", "campaign-new"],
      strategy: "Lookalike de compradores",
      segmentationCriteria: {
        lookalikeSource: "buyers-180d"
      },
      status: "ACTIVE",
      reason: "Nova fase de escala"
    });

    expect(trafficAudienceModel.updateOne).toHaveBeenCalledWith(
      { _id: "audience-5" },
      expect.objectContaining({
        $set: expect.objectContaining({
          campaignIds: ["campaign-new"],
          strategy: "Lookalike de compradores",
          status: "ACTIVE",
          updatedBy: "user-5"
        })
      })
    );
    expect(result.history.at(-1)).toEqual(
      expect.objectContaining({
        action: "UPDATED",
        fromStatus: "DRAFT",
        toStatus: "ACTIVE",
        campaignIdsSnapshot: ["campaign-new"],
        strategySnapshot: "Lookalike de compradores",
        reason: "Nova fase de escala"
      })
    );
  });

  it("lists audiences by campaign and status", async () => {
    trafficAudienceModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "audience-6",
          launchId: "launch-6",
          campaignIds: ["campaign-6"],
          name: "Quente",
          objective: "Conversao",
          strategy: "Remarketing",
          segmentationCriteria: {
            behaviors: ["Visited checkout"]
          },
          status: "ACTIVE",
          history: [],
          active: true
        }
      ])
    });

    const result = await trafficAudienceService.list({
      campaignId: "campaign-6",
      status: "active"
    });

    expect(trafficAudienceModel.find).toHaveBeenCalledWith({
      active: true,
      campaignIds: "campaign-6",
      status: "ACTIVE"
    });
    expect(result[0].id).toBe("audience-6");
  });

  it("deactivates an audience logically and stores history", async () => {
    trafficAudienceModel.findById.mockResolvedValue(
      asDocument({
        id: "audience-7",
        launchId: "launch-7",
        campaignIds: ["campaign-7"],
        name: "Pausado",
        objective: "Conversao",
        strategy: "Remarketing",
        segmentationCriteria: {
          behaviors: ["Visited checkout"]
        },
        status: "PAUSED",
        history: [],
        active: true
      })
    );

    const result = await trafficAudienceService.deactivate("user-7", "audience-7");

    expect(trafficAudienceModel.updateOne).toHaveBeenCalledWith(
      { _id: "audience-7" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "ARCHIVED",
          active: false,
          updatedBy: "user-7"
        })
      })
    );
    expect(result.active).toBe(false);
    expect(result.status).toBe("ARCHIVED");
    expect(result.history.at(-1)).toEqual(
      expect.objectContaining({
        action: "DEACTIVATED",
        fromStatus: "PAUSED",
        toStatus: "ARCHIVED"
      })
    );
  });
});
