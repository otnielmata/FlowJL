import { beforeEach, describe, expect, it, vi } from "vitest";

const aiMetricInsightModel = {
  create: vi.fn(),
  findById: vi.fn()
};
const aiHistoricalContentModel = {
  find: vi.fn()
};
const trafficReportSnapshotModel = {
  find: vi.fn()
};
const launchModel = {
  findById: vi.fn()
};
const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/ai-metric-insight.model.js", () => ({
  AiMetricInsight: aiMetricInsightModel,
  aiMetricInsightFocusAreas: ["GENERAL", "TRAFFIC", "CONTENT", "CONVERSION", "REVENUE"],
  aiMetricInsightSuggestionPriorities: ["LOW", "MEDIUM", "HIGH"]
}));
vi.mock("../src/models/ai-historical-content.model.js", () => ({ AiHistoricalContent: aiHistoricalContentModel }));
vi.mock("../src/models/traffic-report-snapshot.model.js", () => ({ TrafficReportSnapshot: trafficReportSnapshotModel }));
vi.mock("../src/models/launch.model.js", () => ({ Launch: launchModel }));
vi.mock("../src/services/audit.service.js", () => ({ auditService: auditServiceMock }));

const { aiMetricInsightService } = await import("../src/services/ai-metric-insight.service.js");

function queryMock(value) {
  return {
    sort: vi.fn().mockResolvedValue(value)
  };
}

function buildSnapshot(overrides = {}) {
  return {
    id: "snapshot-id",
    launchId: "launch-id",
    campaignId: "campaign-id",
    source: "META",
    periodStart: new Date("2026-07-01T00:00:00.000Z"),
    periodEnd: new Date("2026-07-31T23:59:59.000Z"),
    metrics: {
      impressions: 10000,
      clicks: 100,
      conversions: 3,
      spend: 1000,
      revenue: 900
    },
    syncedAt: new Date("2026-08-01T00:00:00.000Z"),
    active: true,
    ...overrides
  };
}

function buildHistoricalContent(overrides = {}) {
  return {
    id: "content-id",
    launchId: "launch-id",
    title: "Reel de maior desempenho",
    format: "REEL",
    objective: "Aquecimento",
    origin: "ORIGINAL",
    performance: {
      score: 91
    },
    active: true,
    ...overrides
  };
}

function buildInsight(overrides = {}) {
  return {
    id: "insight-id",
    launchId: "launch-id",
    objective: "Melhorar proximo lancamento",
    focusArea: "GENERAL",
    periodStart: new Date("2026-07-01T00:00:00.000Z"),
    periodEnd: new Date("2026-07-31T23:59:59.000Z"),
    suggestions: [
      {
        id: "suggestion-id",
        title: "Revisar oferta e etapa de conversao",
        category: "CONVERSION",
        priority: "HIGH",
        recommendation: "Analise pagina, checkout, promessa e clareza da oferta antes do proximo lancamento.",
        justification: "A taxa de conversao historica foi baixa.",
        humanReviewRequired: true,
        evidenceRefs: [
          {
            sourceType: "AGGREGATED_METRIC",
            sourceId: null,
            label: "Taxa de conversao historica",
            metric: "conversionRate",
            value: 0.03
          }
        ]
      }
    ],
    historicalBasis: {
      traffic: {
        snapshotsCount: 1,
        metrics: {
          impressions: 10000,
          clicks: 100,
          conversions: 3,
          spend: 1000,
          revenue: 900
        },
        rates: {
          ctr: 0.01,
          conversionRate: 0.03,
          roas: 0.9
        }
      },
      content: {
        contentsCount: 1,
        averageScore: 91,
        topContentRefs: [
          {
            id: "content-id",
            title: "Reel de maior desempenho",
            format: "REEL",
            score: 91
          }
        ]
      }
    },
    internalProcessingNotes: "Internal chain of thought must not leak.",
    generatedByAI: true,
    humanReviewRequired: true,
    active: true,
    createdAt: new Date("2026-08-02T00:00:00.000Z"),
    updatedAt: new Date("2026-08-02T00:00:00.000Z"),
    createdBy: "leader-id",
    updatedBy: "leader-id",
    ...overrides
  };
}

describe("aiMetricInsightService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    launchModel.findById.mockResolvedValue({
      id: "launch-id",
      name: "Lancamento Premium",
      active: true
    });
  });

  it("generates structured improvement suggestions from auditable historical metrics", async () => {
    trafficReportSnapshotModel.find.mockReturnValue(queryMock([buildSnapshot()]));
    aiHistoricalContentModel.find.mockReturnValue(queryMock([buildHistoricalContent()]));
    aiMetricInsightModel.create.mockImplementation(async (payload) => buildInsight({
      ...payload,
      id: "insight-id",
      suggestions: payload.suggestions.map((suggestion, index) => ({ id: `suggestion-${index}`, ...suggestion })),
      createdAt: new Date("2026-08-02T00:00:00.000Z"),
      updatedAt: new Date("2026-08-02T00:00:00.000Z")
    }));

    const result = await aiMetricInsightService.generate("leader-id", {
      launchId: "launch-id",
      objective: "Melhorar proximo lancamento",
      focusArea: "GENERAL",
      periodStart: "2026-07-01T00:00:00.000Z",
      periodEnd: "2026-07-31T23:59:59.000Z"
    });

    expect(trafficReportSnapshotModel.find).toHaveBeenCalledWith({
      active: true,
      launchId: "launch-id",
      periodStart: { $lte: new Date("2026-07-31T23:59:59.000Z") },
      periodEnd: { $gte: new Date("2026-07-01T00:00:00.000Z") }
    });
    expect(aiHistoricalContentModel.find).toHaveBeenCalledWith({
      active: true,
      launchId: "launch-id"
    });
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0]).toEqual(expect.objectContaining({
      recommendation: expect.any(String),
      justification: expect.any(String),
      humanReviewRequired: true
    }));
    expect(result.historicalBasis.evidenceSummary.totalEvidenceItems).toBe(2);
    expect(result).not.toHaveProperty("internalProcessingNotes");
    expect(auditServiceMock.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "AI_METRIC_INSIGHT_GENERATED",
      targetType: "AI_METRIC_INSIGHT",
      targetId: "insight-id"
    }));
  });

  it("signals insufficient context when historical metrics are not enough", async () => {
    trafficReportSnapshotModel.find.mockReturnValue(queryMock([]));
    aiHistoricalContentModel.find.mockReturnValue(queryMock([buildHistoricalContent()]));

    await expect(
      aiMetricInsightService.generate("leader-id", {
        objective: "Melhorar proximo lancamento",
        focusArea: "CONTENT"
      })
    ).rejects.toMatchObject({
      statusCode: 422,
      message: "AI metric insights require sufficient historical metrics"
    });

    expect(aiMetricInsightModel.create).not.toHaveBeenCalled();
  });

  it("returns insight detail with historical basis without exposing internal processing notes", async () => {
    aiMetricInsightModel.findById.mockResolvedValue(buildInsight());

    const result = await aiMetricInsightService.getById("leader-id", "insight-id");

    expect(result.id).toBe("insight-id");
    expect(result.historicalBasis.traffic.snapshotsCount).toBe(1);
    expect(result).not.toHaveProperty("internalProcessingNotes");
    expect(auditServiceMock.record).toHaveBeenCalledWith(expect.objectContaining({
      action: "AI_METRIC_INSIGHT_READ",
      targetType: "AI_METRIC_INSIGHT",
      targetId: "insight-id"
    }));
  });
});
