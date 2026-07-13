import { beforeEach, describe, expect, it, vi } from "vitest";

const trafficConversionEventModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const trafficCampaignModel = {
  findById: vi.fn()
};

const trafficPixelModel = {
  findById: vi.fn()
};

const launchModel = {
  findById: vi.fn()
};

const auditService = {
  record: vi.fn()
};

vi.mock("../src/models/traffic-conversion-event.model.js", () => ({
  TrafficConversionEvent: trafficConversionEventModel
}));

vi.mock("../src/models/traffic-campaign.model.js", () => ({
  TrafficCampaign: trafficCampaignModel
}));

vi.mock("../src/models/traffic-pixel.model.js", () => ({
  TrafficPixel: trafficPixelModel
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService
}));

const { trafficConversionEventService } = await import("../src/services/traffic-conversion-event.service.js");

function asDocument(data) {
  return {
    ...data,
    toObject() {
      return this;
    }
  };
}

describe("trafficConversionEventService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a conversion event from a valid campaign and pixel", async () => {
    trafficCampaignModel.findById.mockResolvedValue({
      id: "campaign-1",
      launchId: "launch-1",
      active: true
    });
    trafficPixelModel.findById.mockResolvedValue({
      id: "pixel-1",
      launchId: "launch-1",
      active: true
    });
    launchModel.findById.mockResolvedValue({
      id: "launch-1",
      active: true
    });
    trafficConversionEventModel.create.mockImplementation(async (payload) => ({
      id: "event-1",
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      ...payload
    }));

    const result = await trafficConversionEventService.create("user-1", {
      campaignIds: ["campaign-1"],
      pixelIds: ["pixel-1"],
      name: "Lead qualificado",
      objective: "Medir leads de alta intencao",
      origin: "FORM",
      eventAt: "2026-07-12T15:00:00.000-03:00",
      status: "ACTIVE"
    });

    expect(trafficConversionEventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        launchId: "launch-1",
        campaignIds: ["campaign-1"],
        pixelIds: ["pixel-1"],
        name: "Lead qualificado",
        objective: "Medir leads de alta intencao",
        origin: "FORM",
        status: "ACTIVE",
        eventAt: new Date("2026-07-12T18:00:00.000Z"),
        active: true
      })
    );
    expect(result.eventAt).toEqual(new Date("2026-07-12T18:00:00.000Z"));
    expect(result.history[0]).toEqual(
      expect.objectContaining({
        action: "CREATED",
        campaignIdsSnapshot: ["campaign-1"],
        pixelIdsSnapshot: ["pixel-1"],
        toStatus: "ACTIVE"
      })
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "TRAFFIC_CONVERSION_EVENT_CREATED",
        targetId: "event-1"
      })
    );
  });

  it("creates a manual conversion event directly from a valid launch", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-2",
      active: true
    });
    trafficConversionEventModel.create.mockImplementation(async (payload) => ({
      id: "event-2",
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      ...payload
    }));

    const result = await trafficConversionEventService.create("user-2", {
      launchId: "launch-2",
      name: "Compra aprovada",
      objective: "Medir venda",
      origin: "CHECKOUT"
    });

    expect(trafficCampaignModel.findById).not.toHaveBeenCalled();
    expect(trafficPixelModel.findById).not.toHaveBeenCalled();
    expect(result.launchId).toBe("launch-2");
    expect(result.status).toBe("DRAFT");
  });

  it("rejects creation without launch or campaign context", async () => {
    await expect(
      trafficConversionEventService.create("user-1", {
        name: "Lead",
        objective: "Medir leads",
        origin: "FORM"
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Traffic conversion event requires a launch or campaign context"
    });
  });

  it("rejects campaign links that do not belong to the informed launch", async () => {
    trafficCampaignModel.findById.mockResolvedValue({
      id: "campaign-3",
      launchId: "launch-other",
      active: true
    });

    await expect(
      trafficConversionEventService.create("user-1", {
        launchId: "launch-3",
        campaignIds: ["campaign-3"],
        name: "Lead",
        objective: "Medir leads",
        origin: "FORM"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Conversion event campaigns must belong to the informed launch"
    });
  });

  it("rejects pixels that do not belong to the event launch", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-4",
      active: true
    });
    trafficPixelModel.findById.mockResolvedValue({
      id: "pixel-4",
      launchId: "launch-other",
      active: true
    });

    await expect(
      trafficConversionEventService.create("user-1", {
        launchId: "launch-4",
        pixelIds: ["pixel-4"],
        name: "Lead",
        objective: "Medir leads",
        origin: "FORM"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Conversion event pixels must belong to the event launch"
    });
  });

  it("updates links to campaigns and pixels with an auditable history entry", async () => {
    trafficConversionEventModel.findById.mockResolvedValue(
      asDocument({
        id: "event-5",
        launchId: "launch-5",
        campaignIds: ["campaign-old"],
        pixelIds: [],
        name: "Lead",
        objective: "Medir leads",
        origin: "FORM",
        status: "ACTIVE",
        eventAt: null,
        history: [],
        active: true
      })
    );
    trafficCampaignModel.findById.mockResolvedValue({
      id: "campaign-new",
      launchId: "launch-5",
      active: true
    });
    trafficPixelModel.findById.mockResolvedValue({
      id: "pixel-new",
      launchId: "launch-5",
      active: true
    });

    const result = await trafficConversionEventService.updateLinks("user-5", "event-5", {
      campaignIds: ["campaign-new", "campaign-new"],
      pixelIds: ["pixel-new"],
      reason: "Associar funil principal"
    });

    expect(trafficConversionEventModel.updateOne).toHaveBeenCalledWith(
      { _id: "event-5" },
      expect.objectContaining({
        $set: expect.objectContaining({
          campaignIds: ["campaign-new"],
          pixelIds: ["pixel-new"],
          updatedBy: "user-5"
        })
      })
    );
    expect(result.history.at(-1)).toEqual(
      expect.objectContaining({
        action: "LINKS_UPDATED",
        campaignIdsSnapshot: ["campaign-new"],
        pixelIdsSnapshot: ["pixel-new"],
        reason: "Associar funil principal"
      })
    );
  });

  it("updates status, origin and UTC event date with history", async () => {
    trafficConversionEventModel.findById.mockResolvedValue(
      asDocument({
        id: "event-6",
        launchId: "launch-6",
        campaignIds: [],
        pixelIds: [],
        name: "Lead",
        objective: "Medir leads",
        origin: "FORM",
        status: "DRAFT",
        eventAt: null,
        history: [],
        active: true
      })
    );

    const result = await trafficConversionEventService.update("user-6", "event-6", {
      objective: "Medir leads qualificados",
      origin: "CRM",
      status: "ACTIVE",
      eventAt: "2026-07-12T15:00:00.000-03:00",
      reason: "Evento validado"
    });

    expect(trafficConversionEventModel.updateOne).toHaveBeenCalledWith(
      { _id: "event-6" },
      expect.objectContaining({
        $set: expect.objectContaining({
          objective: "Medir leads qualificados",
          origin: "CRM",
          status: "ACTIVE",
          eventAt: new Date("2026-07-12T18:00:00.000Z"),
          updatedBy: "user-6"
        })
      })
    );
    expect(result.eventAt).toEqual(new Date("2026-07-12T18:00:00.000Z"));
    expect(result.history.at(-1)).toEqual(
      expect.objectContaining({
        action: "UPDATED",
        fromStatus: "DRAFT",
        toStatus: "ACTIVE",
        eventAtSnapshot: new Date("2026-07-12T18:00:00.000Z"),
        reason: "Evento validado"
      })
    );
  });

  it("lists conversion events by campaign, pixel, origin and status", async () => {
    trafficConversionEventModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "event-7",
          launchId: "launch-7",
          campaignIds: ["campaign-7"],
          pixelIds: ["pixel-7"],
          name: "Compra",
          objective: "Medir venda",
          origin: "CHECKOUT",
          status: "ACTIVE",
          eventAt: new Date("2026-07-12T18:00:00.000Z"),
          history: [],
          active: true
        }
      ])
    });

    const result = await trafficConversionEventService.list({
      campaignId: "campaign-7",
      pixelId: "pixel-7",
      origin: "checkout",
      status: "active"
    });

    expect(trafficConversionEventModel.find).toHaveBeenCalledWith({
      active: true,
      campaignIds: "campaign-7",
      pixelIds: "pixel-7",
      origin: "CHECKOUT",
      status: "ACTIVE"
    });
    expect(result[0].id).toBe("event-7");
  });

  it("deactivates a conversion event logically and stores history", async () => {
    trafficConversionEventModel.findById.mockResolvedValue(
      asDocument({
        id: "event-8",
        launchId: "launch-8",
        campaignIds: ["campaign-8"],
        pixelIds: ["pixel-8"],
        name: "Compra",
        objective: "Medir venda",
        origin: "CHECKOUT",
        status: "PAUSED",
        eventAt: new Date("2026-07-12T18:00:00.000Z"),
        history: [],
        active: true
      })
    );

    const result = await trafficConversionEventService.deactivate("user-8", "event-8");

    expect(trafficConversionEventModel.updateOne).toHaveBeenCalledWith(
      { _id: "event-8" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "ARCHIVED",
          active: false,
          updatedBy: "user-8"
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
