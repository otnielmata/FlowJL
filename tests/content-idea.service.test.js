import { beforeEach, describe, expect, it, vi } from "vitest";

const contentIdeaModel = {
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

vi.mock("../src/models/content-idea.model.js", () => ({
  ContentIdea: contentIdeaModel
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { contentIdeaService } = await import("../src/services/content-idea.service.js");

describe("contentIdeaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    contentIdeaModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  });

  it("creates a content idea with optional launch binding", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-id"
    });
    contentIdeaModel.create.mockResolvedValue({
      id: "idea-id",
      launchId: "launch-id",
      theme: "Tema reaproveitavel",
      objective: "Conversao",
      suggestedFormat: "Carrossel",
      observations: "Gancho validado em outro lancamento",
      status: "BACKLOG",
      active: true,
      deactivatedAt: null,
      createdAt: new Date("2026-07-11T12:00:00.000Z"),
      updatedAt: new Date("2026-07-11T12:00:00.000Z"),
      createdBy: "social-id",
      updatedBy: "social-id"
    });

    const result = await contentIdeaService.create("social-id", {
      launchId: "launch-id",
      theme: " Tema reaproveitavel ",
      objective: " Conversao ",
      suggestedFormat: " Carrossel ",
      observations: " Gancho validado em outro lancamento "
    });

    expect(launchModel.findById).toHaveBeenCalledWith("launch-id");
    expect(contentIdeaModel.create).toHaveBeenCalledWith({
      launchId: "launch-id",
      theme: "Tema reaproveitavel",
      objective: "Conversao",
      suggestedFormat: "Carrossel",
      observations: "Gancho validado em outro lancamento",
      status: "BACKLOG",
      active: true,
      deactivatedAt: null,
      createdBy: "social-id",
      updatedBy: "social-id"
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "social-id",
      action: "CONTENT_IDEA_CREATED",
      targetType: "CONTENT_IDEA",
      targetId: "idea-id",
      context: {
        launchId: "launch-id",
        objective: "Conversao",
        status: "BACKLOG"
      }
    });
    expect(result.status).toBe("BACKLOG");
    expect(result.active).toBe(true);
  });

  it("lists content ideas filtered by launch, objective and status", async () => {
    contentIdeaModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "idea-id",
          launchId: "launch-id",
          theme: "Tema reaproveitavel",
          objective: "Conversao",
          suggestedFormat: "Carrossel",
          observations: "Gancho validado",
          status: "BACKLOG",
          active: true,
          deactivatedAt: null,
          createdAt: new Date("2026-07-11T12:00:00.000Z"),
          updatedAt: new Date("2026-07-11T12:00:00.000Z"),
          createdBy: "social-id",
          updatedBy: "social-id"
        }
      ])
    });

    const result = await contentIdeaService.list({
      launchId: "launch-id",
      objective: "Conversao",
      status: "BACKLOG"
    });

    expect(contentIdeaModel.find).toHaveBeenCalledWith({
      launchId: "launch-id",
      objective: {
        $regex: /^Conversao$/i
      },
      status: "BACKLOG"
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("idea-id");
  });

  it("deactivates a content idea without deleting history", async () => {
    contentIdeaModel.findById.mockResolvedValue({
      id: "idea-id",
      launchId: "launch-id",
      theme: "Tema reaproveitavel",
      objective: "Conversao",
      suggestedFormat: "Carrossel",
      observations: "Gancho validado",
      status: "BACKLOG",
      active: true,
      deactivatedAt: null,
      createdAt: new Date("2026-07-11T12:00:00.000Z"),
      updatedAt: new Date("2026-07-11T12:00:00.000Z"),
      createdBy: "social-id",
      updatedBy: "social-id"
    });

    const result = await contentIdeaService.deactivate("social-id", "idea-id");

    expect(contentIdeaModel.updateOne).toHaveBeenCalledWith(
      { _id: "idea-id" },
      {
        $set: {
          status: "DISCARDED",
          active: false,
          deactivatedAt: expect.any(Date),
          updatedBy: "social-id"
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "social-id",
      action: "CONTENT_IDEA_DEACTIVATED",
      targetType: "CONTENT_IDEA",
      targetId: "idea-id",
      context: {
        launchId: "launch-id",
        previousStatus: "BACKLOG",
        status: "DISCARDED"
      }
    });
    expect(result.active).toBe(false);
    expect(result.status).toBe("DISCARDED");
    expect(result.deactivatedAt).toBeInstanceOf(Date);
  });

  it("rejects launch binding when the launch does not exist", async () => {
    launchModel.findById.mockResolvedValue(null);

    await expect(
      contentIdeaService.create("social-id", {
        launchId: "launch-id",
        theme: "Tema",
        objective: "Conversao",
        suggestedFormat: "Carrossel",
        observations: "Observacao"
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Launch not found"
    });
  });
});
