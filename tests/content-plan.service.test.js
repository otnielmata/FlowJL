import { beforeEach, describe, expect, it, vi } from "vitest";

const launchModel = {
  findById: vi.fn()
};

const editorialLineModel = {
  findOne: vi.fn()
};

const contentPlanModel = {
  findOne: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  updateOne: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/editorial-line.model.js", () => ({
  EditorialLine: editorialLineModel
}));

vi.mock("../src/models/content-plan.model.js", () => ({
  ContentPlan: contentPlanModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { contentPlanService } = await import("../src/services/content-plan.service.js");

describe("contentPlanService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
  });

  it("creates the current content plan when editorial line exists", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    contentPlanModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockResolvedValue(null)
    });
    editorialLineModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ version: 2 })
    });
    contentPlanModel.create.mockResolvedValue({
      id: "content-plan-id",
      launchId: "launch-id",
      version: 1,
      items: [
        {
          id: "item-1",
          theme: "Tema 1",
          format: "Reel",
          objective: "Autoridade",
          cta: "Comentar",
          stage: "Aquecimento",
          periodLabel: "Semana 1",
          active: true
        }
      ],
      editorialLineVersion: 2,
      isCurrent: true,
      active: true,
      createdAt: new Date("2026-07-11T22:00:00.000Z"),
      updatedAt: new Date("2026-07-11T22:00:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await contentPlanService.create("strategist-id", "launch-id", {
      items: [
        {
          theme: " Tema 1 ",
          format: " Reel ",
          objective: " Autoridade ",
          cta: " Comentar ",
          stage: " Aquecimento ",
          periodLabel: " Semana 1 "
        }
      ]
    });

    expect(contentPlanModel.create).toHaveBeenCalledWith(expect.objectContaining({
      launchId: "launch-id",
      version: 1,
      editorialLineVersion: 2
    }));
    expect(result.grouped.byStage[0].stage).toBe("Aquecimento");
  });

  it("updates the content plan preserving history", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    contentPlanModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockResolvedValue({
        id: "content-plan-v1",
        version: 1,
        createdBy: "strategist-id"
      })
    });
    editorialLineModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ version: 3 })
    });
    contentPlanModel.updateOne.mockResolvedValue(undefined);
    contentPlanModel.create.mockResolvedValue({
      id: "content-plan-v2",
      launchId: "launch-id",
      version: 2,
      items: [
        {
          id: "item-2",
          theme: "Tema 2",
          format: "Carrossel",
          objective: "Conversao",
          cta: "Entrar na lista",
          stage: "Lancamento",
          periodLabel: "Semana 2",
          active: true
        }
      ],
      editorialLineVersion: 3,
      isCurrent: true,
      active: true,
      createdAt: new Date("2026-07-11T22:10:00.000Z"),
      updatedAt: new Date("2026-07-11T22:10:00.000Z"),
      createdBy: "strategist-id",
      updatedBy: "strategist-id"
    });

    const result = await contentPlanService.update("strategist-id", "launch-id", {
      items: [
        {
          theme: "Tema 2",
          format: "Carrossel",
          objective: "Conversao",
          cta: "Entrar na lista",
          stage: "Lancamento",
          periodLabel: "Semana 2"
        }
      ]
    });

    expect(contentPlanModel.updateOne).toHaveBeenCalledWith(
      { _id: "content-plan-v1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          isCurrent: false,
          active: false
        })
      })
    );
    expect(result.version).toBe(2);
  });

  it("rejects creation when no editorial line exists", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id" });
    contentPlanModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockResolvedValue(null)
    });
    editorialLineModel.findOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue(null)
    });

    await expect(
      contentPlanService.create("strategist-id", "launch-id", {
        items: [
          {
            theme: "Tema 1",
            format: "Reel",
            objective: "Autoridade",
            cta: "Comentar",
            stage: "Aquecimento",
            periodLabel: "Semana 1"
          }
        ]
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Content plan requires an editorial line"
    });
  });
});
