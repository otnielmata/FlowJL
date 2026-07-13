import { beforeEach, describe, expect, it, vi } from "vitest";

const liveEventModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const launchModel = {
  findById: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/live-event.model.js", () => ({
  LiveEvent: liveEventModel,
  liveEventStatuses: ["PLANNED", "CONFIRMED", "LIVE", "COMPLETED", "CANCELED", "RESCHEDULED"]
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { liveEventService } = await import("../src/services/live-event.service.js");

function buildLiveEvent(overrides = {}) {
  return {
    id: "event-id",
    launchId: "launch-id",
    name: "Aulao de abertura",
    scheduledAt: new Date("2026-07-22T22:00:00.000Z"),
    channel: "YouTube",
    responsible: "Operacoes",
    status: "PLANNED",
    accessUrl: "https://youtube.com/live/demo",
    notes: "Preparar sala 30 minutos antes",
    active: true,
    deactivatedAt: null,
    createdAt: new Date("2026-07-12T12:00:00.000Z"),
    updatedAt: new Date("2026-07-12T12:00:00.000Z"),
    createdBy: "operator-id",
    updatedBy: "operator-id",
    toObject() {
      return { ...this };
    },
    ...overrides
  };
}

describe("liveEventService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    liveEventModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  });

  it("creates a live event with launch context, channel and UTC schedule", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id", active: true });
    liveEventModel.create.mockResolvedValue(buildLiveEvent());

    const result = await liveEventService.create("operator-id", {
      launchId: "launch-id",
      name: " Aulao de abertura ",
      scheduledAt: "2026-07-22T22:00:00.000Z",
      channel: " YouTube ",
      responsible: " Operacoes ",
      status: "PLANNED",
      accessUrl: " https://youtube.com/live/demo ",
      notes: " Preparar sala 30 minutos antes "
    });

    expect(liveEventModel.create).toHaveBeenCalledWith({
      launchId: "launch-id",
      name: "Aulao de abertura",
      scheduledAt: new Date("2026-07-22T22:00:00.000Z"),
      channel: "YouTube",
      responsible: "Operacoes",
      status: "PLANNED",
      accessUrl: "https://youtube.com/live/demo",
      notes: "Preparar sala 30 minutos antes",
      active: true,
      deactivatedAt: null,
      createdBy: "operator-id",
      updatedBy: "operator-id"
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "operator-id",
      action: "LIVE_EVENT_CREATED",
      targetType: "LIVE_EVENT",
      targetId: "event-id",
      context: {
        launchId: "launch-id",
        scheduledAt: new Date("2026-07-22T22:00:00.000Z"),
        channel: "YouTube",
        responsible: "Operacoes",
        status: "PLANNED"
      }
    });
    expect(result.scheduledAt).toEqual(new Date("2026-07-22T22:00:00.000Z"));
  });

  it("lists active live events filtered by launch, channel, status, responsible and period", async () => {
    liveEventModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([buildLiveEvent()])
    });

    const result = await liveEventService.list({
      launchId: "launch-id",
      channel: " YouTube ",
      status: "CONFIRMED",
      responsible: " Operacoes ",
      startAt: "2026-07-22T00:00:00.000Z",
      endAt: "2026-07-22T23:59:59.999Z"
    });

    expect(liveEventModel.find).toHaveBeenCalledWith({
      launchId: "launch-id",
      status: "CONFIRMED",
      channel: "YouTube",
      responsible: "Operacoes",
      active: true,
      scheduledAt: {
        $gte: new Date("2026-07-22T00:00:00.000Z"),
        $lte: new Date("2026-07-22T23:59:59.999Z")
      }
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("event-id");
  });

  it("updates status, schedule and responsible with audit trail", async () => {
    liveEventModel.findById.mockResolvedValue(buildLiveEvent());

    const result = await liveEventService.update("operator-id", "event-id", {
      scheduledAt: "2026-07-23T22:30:00.000Z",
      responsible: "Suporte",
      status: "RESCHEDULED"
    });

    expect(liveEventModel.updateOne).toHaveBeenCalledWith(
      { _id: "event-id" },
      {
        $set: {
          name: "Aulao de abertura",
          scheduledAt: new Date("2026-07-23T22:30:00.000Z"),
          channel: "YouTube",
          responsible: "Suporte",
          status: "RESCHEDULED",
          accessUrl: "https://youtube.com/live/demo",
          notes: "Preparar sala 30 minutos antes",
          updatedBy: "operator-id"
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "operator-id",
      action: "LIVE_EVENT_UPDATED",
      targetType: "LIVE_EVENT",
      targetId: "event-id",
      context: {
        launchId: "launch-id",
        previousScheduledAt: new Date("2026-07-22T22:00:00.000Z"),
        scheduledAt: new Date("2026-07-23T22:30:00.000Z"),
        previousChannel: "YouTube",
        channel: "YouTube",
        previousResponsible: "Operacoes",
        responsible: "Suporte",
        previousStatus: "PLANNED",
        status: "RESCHEDULED"
      }
    });
    expect(result.status).toBe("RESCHEDULED");
  });

  it("rejects creation when launch context does not exist", async () => {
    launchModel.findById.mockResolvedValue(null);

    await expect(
      liveEventService.create("operator-id", {
        launchId: "launch-id",
        name: "Aulao",
        scheduledAt: "2026-07-22T22:00:00.000Z",
        channel: "YouTube",
        responsible: "Operacoes",
        status: "PLANNED"
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Launch not found"
    });
  });

  it("deactivates a live event logically", async () => {
    liveEventModel.findById.mockResolvedValue(buildLiveEvent());

    const result = await liveEventService.deactivate("operator-id", "event-id");

    expect(liveEventModel.updateOne).toHaveBeenCalledWith(
      { _id: "event-id" },
      {
        $set: {
          active: false,
          deactivatedAt: expect.any(Date),
          updatedBy: "operator-id"
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "LIVE_EVENT_DEACTIVATED",
        targetType: "LIVE_EVENT",
        targetId: "event-id"
      })
    );
    expect(result.active).toBe(false);
    expect(result.deactivatedAt).toEqual(expect.any(Date));
  });
});
