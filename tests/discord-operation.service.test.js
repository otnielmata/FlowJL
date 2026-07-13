import { beforeEach, describe, expect, it, vi } from "vitest";

const discordOperationModel = {
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

vi.mock("../src/models/discord-operation.model.js", () => ({
  DiscordOperation: discordOperationModel,
  discordOperationStatuses: ["TODO", "IN_PROGRESS", "DONE", "BLOCKED", "CANCELED"]
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { discordOperationService } = await import("../src/services/discord-operation.service.js");

function buildDiscordOperation(overrides = {}) {
  return {
    id: "discord-operation-id",
    launchId: "launch-id",
    type: "COMMUNITY_MODERATION",
    activity: "Publicar aviso de boas-vindas",
    responsible: "Operacoes",
    dueAt: new Date("2026-07-24T13:00:00.000Z"),
    status: "TODO",
    observations: "Fixar no canal geral",
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

describe("discordOperationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    discordOperationModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  });

  it("creates a trackable Discord operation with launch context", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id", active: true });
    discordOperationModel.create.mockResolvedValue(buildDiscordOperation());

    const result = await discordOperationService.create("operator-id", {
      launchId: "launch-id",
      type: " COMMUNITY_MODERATION ",
      activity: " Publicar aviso de boas-vindas ",
      responsible: " Operacoes ",
      dueAt: "2026-07-24T13:00:00.000Z",
      status: "TODO",
      observations: " Fixar no canal geral "
    });

    expect(discordOperationModel.create).toHaveBeenCalledWith({
      launchId: "launch-id",
      type: "COMMUNITY_MODERATION",
      activity: "Publicar aviso de boas-vindas",
      responsible: "Operacoes",
      dueAt: new Date("2026-07-24T13:00:00.000Z"),
      status: "TODO",
      observations: "Fixar no canal geral",
      active: true,
      deactivatedAt: null,
      createdBy: "operator-id",
      updatedBy: "operator-id"
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "operator-id",
      action: "DISCORD_OPERATION_CREATED",
      targetType: "DISCORD_OPERATION",
      targetId: "discord-operation-id",
      context: {
        launchId: "launch-id",
        type: "COMMUNITY_MODERATION",
        dueAt: new Date("2026-07-24T13:00:00.000Z"),
        responsible: "Operacoes",
        status: "TODO"
      }
    });
    expect(result.dueAt).toEqual(new Date("2026-07-24T13:00:00.000Z"));
  });

  it("lists active Discord operations filtered by launch, type, responsible, status and period", async () => {
    discordOperationModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([buildDiscordOperation()])
    });

    const result = await discordOperationService.list({
      launchId: "launch-id",
      type: " COMMUNITY_MODERATION ",
      responsible: " Operacoes ",
      status: "IN_PROGRESS",
      startAt: "2026-07-24T00:00:00.000Z",
      endAt: "2026-07-24T23:59:59.999Z"
    });

    expect(discordOperationModel.find).toHaveBeenCalledWith({
      launchId: "launch-id",
      type: "COMMUNITY_MODERATION",
      status: "IN_PROGRESS",
      responsible: "Operacoes",
      active: true,
      dueAt: {
        $gte: new Date("2026-07-24T00:00:00.000Z"),
        $lte: new Date("2026-07-24T23:59:59.999Z")
      }
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("discord-operation-id");
  });

  it("updates status and observations with audit trail", async () => {
    discordOperationModel.findById.mockResolvedValue(buildDiscordOperation());

    const result = await discordOperationService.update("operator-id", "discord-operation-id", {
      status: "IN_PROGRESS",
      observations: "Aviso publicado e aguardando revisao"
    });

    expect(discordOperationModel.updateOne).toHaveBeenCalledWith(
      { _id: "discord-operation-id" },
      {
        $set: {
          type: "COMMUNITY_MODERATION",
          activity: "Publicar aviso de boas-vindas",
          responsible: "Operacoes",
          dueAt: new Date("2026-07-24T13:00:00.000Z"),
          status: "IN_PROGRESS",
          observations: "Aviso publicado e aguardando revisao",
          updatedBy: "operator-id"
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "operator-id",
      action: "DISCORD_OPERATION_UPDATED",
      targetType: "DISCORD_OPERATION",
      targetId: "discord-operation-id",
      context: {
        launchId: "launch-id",
        previousStatus: "TODO",
        status: "IN_PROGRESS",
        previousResponsible: "Operacoes",
        responsible: "Operacoes",
        previousDueAt: new Date("2026-07-24T13:00:00.000Z"),
        dueAt: new Date("2026-07-24T13:00:00.000Z"),
        observationsChanged: true
      }
    });
    expect(result.status).toBe("IN_PROGRESS");
  });

  it("rejects creation when launch context does not exist", async () => {
    launchModel.findById.mockResolvedValue(null);

    await expect(
      discordOperationService.create("operator-id", {
        launchId: "launch-id",
        type: "COMMUNITY_MODERATION",
        activity: "Publicar aviso",
        responsible: "Operacoes",
        dueAt: "2026-07-24T13:00:00.000Z",
        status: "TODO"
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Launch not found"
    });
  });

  it("deactivates a Discord operation logically", async () => {
    discordOperationModel.findById.mockResolvedValue(buildDiscordOperation());

    const result = await discordOperationService.deactivate("operator-id", "discord-operation-id");

    expect(discordOperationModel.updateOne).toHaveBeenCalledWith(
      { _id: "discord-operation-id" },
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
        action: "DISCORD_OPERATION_DEACTIVATED",
        targetType: "DISCORD_OPERATION",
        targetId: "discord-operation-id"
      })
    );
    expect(result.active).toBe(false);
    expect(result.deactivatedAt).toEqual(expect.any(Date));
  });
});
