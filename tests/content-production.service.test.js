import { beforeEach, describe, expect, it, vi } from "vitest";

const contentProductionModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const launchModel = { findById: vi.fn() };
const auditServiceMock = { record: vi.fn() };

vi.mock("../src/models/content-production.model.js", () => ({
  ContentProduction: contentProductionModel,
  contentProductionFormats: ["REEL", "CAROUSEL", "STORIES", "EMAIL", "YOUTUBE", "ADS", "LANDING_PAGE"],
  contentProductionChannels: ["INSTAGRAM", "FACEBOOK", "YOUTUBE", "EMAIL", "WHATSAPP", "LINKEDIN", "BLOG", "META_ADS"],
  contentProductionStatuses: ["DRAFT", "IN_REVIEW", "APPROVED", "REJECTED", "SCHEDULED", "PUBLISHED"],
  contentProductionActionTypes: ["REWRITE", "SUMMARIZE", "VARIATION", "ADAPT_CHANNEL", "SEND_APPROVAL", "APPROVE", "REJECT"]
}));
vi.mock("../src/models/launch.model.js", () => ({ Launch: launchModel }));
vi.mock("../src/services/audit.service.js", () => ({ auditService: auditServiceMock }));

const { contentProductionService } = await import("../src/services/content-production.service.js");

function buildContent(overrides = {}) {
  return {
    id: "content-1",
    launchId: "launch-1",
    objective: "Aumentar leads",
    format: "REEL",
    channel: "INSTAGRAM",
    responsible: "Ana",
    currentStatus: "DRAFT",
    versions: [
      {
        id: "version-1",
        version: 1,
        title: "Roteiro principal",
        summary: "Resumo inicial",
        body: "Texto base do conteudo com detalhes suficientes.",
        channel: "INSTAGRAM",
        format: "REEL",
        aiActionType: null,
        comparisonBaseVersion: null,
        diffSummary: "Versao inicial criada.",
        createdBy: "user-1",
        createdAt: new Date("2026-07-13T13:00:00.000Z")
      }
    ],
    currentVersion: 1,
    attachments: [
      {
        id: "attachment-1",
        name: "briefing.pdf",
        url: "https://files.example/briefing.pdf",
        mediaType: "application/pdf"
      }
    ],
    references: [
      {
        id: "reference-1",
        label: "Oferta vigente",
        url: "https://docs.example/oferta"
      }
    ],
    publication: {
      publishAt: new Date("2026-07-20T14:00:00.000Z"),
      publishedAt: null,
      status: "SCHEDULED"
    },
    approval: {
      status: "NOT_SENT",
      approverUserId: null,
      approverName: null,
      requestedBy: null,
      requestedAt: null,
      respondedBy: null,
      respondedAt: null,
      rejectionReason: null
    },
    history: [],
    active: true,
    createdAt: new Date("2026-07-13T13:00:00.000Z"),
    updatedAt: new Date("2026-07-13T13:00:00.000Z"),
    createdBy: "user-1",
    updatedBy: "user-1",
    toObject() {
      return { ...this };
    },
    ...overrides
  };
}

function mockSortedFindValue(model, value) {
  model.find.mockReturnValue({
    sort: vi.fn().mockResolvedValue(value)
  });
}

describe("contentProductionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    launchModel.findById.mockResolvedValue({ id: "launch-1", active: true });
    auditServiceMock.record.mockResolvedValue(undefined);
    contentProductionModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  });

  it("creates a content production item with attachments and initial version", async () => {
    contentProductionModel.create.mockResolvedValue(buildContent());

    const result = await contentProductionService.create("user-1", {
      launchId: "launch-1",
      title: " Roteiro principal ",
      summary: " Resumo inicial ",
      body: " Texto base do conteudo com detalhes suficientes. ",
      objective: " Aumentar leads ",
      format: "REEL",
      channel: "INSTAGRAM",
      responsible: " Ana ",
      status: "DRAFT",
      attachments: [{ name: "briefing.pdf", url: "https://files.example/briefing.pdf", mediaType: "application/pdf" }],
      references: [{ label: "Oferta vigente", url: "https://docs.example/oferta" }],
      publication: { publishAt: "2026-07-20T14:00:00.000Z", status: "SCHEDULED" },
      actorName: "Ana"
    });

    expect(contentProductionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        launchId: "launch-1",
        objective: "Aumentar leads",
        format: "REEL",
        channel: "INSTAGRAM",
        responsible: "Ana",
        currentStatus: "DRAFT"
      })
    );
    expect(result.attachments).toHaveLength(1);
    expect(result.currentVersion).toBe(1);
  });

  it("lists content items with title, format, channel, status, launch and approver", async () => {
    mockSortedFindValue(contentProductionModel, [
      buildContent({
        approval: {
          status: "PENDING",
          approverUserId: "approver-1",
          approverName: "Clara",
          rejectionReason: null
        }
      })
    ]);

    const result = await contentProductionService.list({
      format: "REEL",
      channel: "INSTAGRAM",
      status: "DRAFT"
    });

    expect(contentProductionModel.find).toHaveBeenCalledWith({
      active: true,
      format: "REEL",
      channel: "INSTAGRAM",
      currentStatus: "DRAFT"
    });
    expect(result[0]).toEqual(
      expect.objectContaining({
        title: "Roteiro principal",
        format: "REEL",
        channel: "INSTAGRAM",
        status: "DRAFT",
        approver: expect.objectContaining({
          name: "Clara"
        })
      })
    );
  });

  it("returns detail with version comparison and history", async () => {
    contentProductionModel.findById.mockResolvedValue(
      buildContent({
        versions: [
          {
            id: "version-1",
            version: 1,
            title: "Roteiro principal",
            summary: "Resumo inicial",
            body: "Texto base do conteudo com detalhes suficientes.",
            channel: "INSTAGRAM",
            format: "REEL",
            aiActionType: null,
            comparisonBaseVersion: null,
            diffSummary: "Versao inicial criada.",
            createdBy: "user-1",
            createdAt: new Date("2026-07-13T13:00:00.000Z")
          },
          {
            id: "version-2",
            version: 2,
            title: "Roteiro principal revisado",
            summary: "Resumo revisado",
            body: "Texto base revisado com melhoria de gancho e CTA.",
            channel: "INSTAGRAM",
            format: "REEL",
            aiActionType: "REWRITE",
            comparisonBaseVersion: 1,
            diffSummary: "Mudancas: titulo ajustado, resumo ajustado, corpo revisado.",
            createdBy: "user-2",
            createdAt: new Date("2026-07-13T15:00:00.000Z")
          }
        ],
        currentVersion: 2
      })
    );

    const result = await contentProductionService.getById("content-1");

    expect(result.comparison.current.version).toBe(2);
    expect(result.comparison.previous.version).toBe(1);
    expect(result.versions).toHaveLength(2);
  });

  it("updates content by creating a new version and preserving accessible comparison", async () => {
    contentProductionModel.findById.mockResolvedValue(buildContent());

    const result = await contentProductionService.update("user-2", "content-1", {
      title: "Roteiro principal revisado",
      summary: "Resumo revisado",
      body: "Texto base revisado com melhoria de gancho e CTA.",
      actorName: "Clara"
    });

    expect(contentProductionModel.updateOne).toHaveBeenCalledWith(
      { _id: "content-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          currentVersion: 2
        })
      })
    );
    expect(result.currentVersion).toBe(2);
    expect(result.comparison.previous.version).toBe(1);
  });

  it("runs AI actions and creates a comparable new version", async () => {
    contentProductionModel.findById.mockResolvedValue(buildContent());

    const result = await contentProductionService.runAction("user-3", "content-1", {
      actionType: "ADAPT_CHANNEL",
      targetChannel: "YOUTUBE",
      actorName: "Bruna"
    });

    expect(contentProductionModel.updateOne).toHaveBeenCalledWith(
      { _id: "content-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          currentVersion: 2,
          channel: "YOUTUBE"
        })
      })
    );
    expect(result.currentVersion).toBe(2);
    expect(result.channel).toBe("YOUTUBE");
    expect(result.history.at(-1).actionType).toBe("ADAPT_CHANNEL");
  });

  it("sends content for approval and stores approver metadata", async () => {
    contentProductionModel.findById.mockResolvedValue(buildContent());

    const result = await contentProductionService.runAction("user-4", "content-1", {
      actionType: "SEND_APPROVAL",
      approverName: "Paula",
      approverUserId: "approver-9",
      actorName: "Bruna"
    });

    expect(result.status).toBe("IN_REVIEW");
    expect(result.approver).toEqual(
      expect.objectContaining({
        status: "PENDING",
        name: "Paula"
      })
    );
  });

  it("rejects content with reason and allows a later new iteration", async () => {
    contentProductionModel.findById
      .mockResolvedValueOnce(buildContent({ currentStatus: "DRAFT" }))
      .mockResolvedValueOnce(
        buildContent({
          currentStatus: "IN_REVIEW",
          approval: {
            status: "PENDING",
            approverUserId: "approver-9",
            approverName: "Paula",
            requestedBy: "user-4",
            requestedAt: new Date("2026-07-13T16:00:00.000Z"),
            respondedBy: null,
            respondedAt: null,
            rejectionReason: null
          }
        })
      );

    await contentProductionService.runAction("user-4", "content-1", {
      actionType: "SEND_APPROVAL",
      approverName: "Paula",
      approverUserId: "approver-9",
      actorName: "Bruna"
    });

    const rejected = await contentProductionService.runAction("user-5", "content-1", {
      actionType: "REJECT",
      reason: "Gancho inicial fraco",
      actorName: "Paula"
    });

    expect(rejected.status).toBe("REJECTED");
    expect(rejected.approver.rejectionReason).toBe("Gancho inicial fraco");
  });
});
