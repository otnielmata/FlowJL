import { beforeEach, describe, expect, it, vi } from "vitest";

const launchModel = {
  findById: vi.fn()
};

const operationalScheduleModel = {
  find: vi.fn()
};

const contentProductionModel = {
  find: vi.fn()
};

const publicationModel = {
  find: vi.fn()
};

const contentApprovalModel = {
  find: vi.fn()
};

const trafficCampaignModel = {
  find: vi.fn()
};

const trafficReportSnapshotModel = {
  find: vi.fn()
};

const reportViewModel = {
  create: vi.fn(),
  find: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/launch.model.js", () => ({ Launch: launchModel }));
vi.mock("../src/models/operational-schedule.model.js", () => ({ OperationalSchedule: operationalScheduleModel }));
vi.mock("../src/models/content-production.model.js", () => ({ ContentProduction: contentProductionModel }));
vi.mock("../src/models/publication.model.js", () => ({ Publication: publicationModel }));
vi.mock("../src/models/content-approval.model.js", () => ({ ContentApproval: contentApprovalModel }));
vi.mock("../src/models/traffic-campaign.model.js", () => ({ TrafficCampaign: trafficCampaignModel }));
vi.mock("../src/models/traffic-report-snapshot.model.js", () => ({ TrafficReportSnapshot: trafficReportSnapshotModel }));
vi.mock("../src/models/report-view.model.js", () => ({
  ReportView: reportViewModel,
  reportViewTypes: ["FILTER_VIEW", "CUSTOM_DASHBOARD"]
}));
vi.mock("../src/services/audit.service.js", () => ({ auditService: auditServiceMock }));

const { reportsService } = await import("../src/services/reports.service.js");

function mockFindWithSort(model, value) {
  model.find.mockReturnValue({
    sort: vi.fn().mockResolvedValue(value)
  });
}

function buildView(overrides = {}) {
  return {
    id: "view-1",
    name: "Painel executivo semanal",
    description: "Visao principal",
    type: "CUSTOM_DASHBOARD",
    ownerUserId: "user-1",
    filters: {
      launchId: "launch-1",
      periodStart: new Date("2026-07-01T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T23:59:59.000Z"),
      comparePeriodStart: null,
      comparePeriodEnd: null,
      responsible: null,
      channel: "META",
      campaignId: null,
      status: null,
      approvalStatus: null
    },
    layout: {
      widgets: ["executiveIndicators", "topCampaigns"],
      shared: true
    },
    lastExportedAt: null,
    active: true,
    createdAt: new Date("2026-07-13T12:00:00.000Z"),
    updatedAt: new Date("2026-07-13T12:10:00.000Z"),
    ...overrides
  };
}

describe("reportsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    launchModel.findById.mockResolvedValue({
      id: "launch-1",
      name: "Flow JL 2026",
      expert: "Otniel",
      product: "Mentoria Premium",
      status: "IN_PROGRESS",
      active: true
    });
    mockFindWithSort(operationalScheduleModel, [
      {
        id: "op-1",
        launchId: "launch-1",
        title: "Publicar pagina",
        area: "CONTENT",
        responsible: "Ana",
        priority: "HIGH",
        status: "DONE",
        startsAt: new Date("2026-07-10T09:00:00.000Z"),
        dueAt: new Date("2026-07-10T18:00:00.000Z")
      },
      {
        id: "op-2",
        launchId: "launch-1",
        title: "Validar automacao",
        area: "OPERATIONS",
        responsible: "Ana",
        priority: "CRITICAL",
        status: "IN_PROGRESS",
        startsAt: new Date("2026-07-12T09:00:00.000Z"),
        dueAt: new Date("2026-07-12T18:00:00.000Z")
      }
    ]);
    mockFindWithSort(contentProductionModel, [
      {
        id: "content-1",
        launchId: "launch-1",
        channel: "META",
        responsible: "Ana",
        currentStatus: "PUBLISHED"
      }
    ]);
    mockFindWithSort(publicationModel, [
      {
        id: "publication-1",
        launchId: "launch-1",
        channel: "META",
        status: "PUBLISHED",
        publishAt: new Date("2026-07-11T12:00:00.000Z")
      }
    ]);
    mockFindWithSort(contentApprovalModel, [
      {
        id: "approval-1",
        launchId: "launch-1",
        contentType: "REEL",
        contentId: "content-1",
        currentStatus: "REVIEW",
        updatedAt: new Date("2026-07-11T14:00:00.000Z"),
        createdAt: new Date("2026-07-10T14:00:00.000Z")
      }
    ]);
    mockFindWithSort(trafficCampaignModel, [
      {
        id: "campaign-1",
        launchId: "launch-1",
        name: "Meta Leads",
        channel: "META",
        status: "ACTIVE",
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-07-31T23:59:59.000Z")
      }
    ]);
    mockFindWithSort(trafficReportSnapshotModel, [
      {
        id: "snapshot-1",
        launchId: "launch-1",
        campaignId: "campaign-1",
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-07-31T23:59:59.000Z"),
        syncedAt: new Date("2026-07-13T09:00:00.000Z"),
        metrics: {
          impressions: 1000,
          clicks: 100,
          conversions: 12,
          spend: 240,
          revenue: 1800
        }
      }
    ]);
  });

  it("returns consolidated executive and operational analytics with filters, indicators, charts and tables", async () => {
    const result = await reportsService.getAnalytics("user-1", {
      launchId: "launch-1",
      periodStart: "2026-07-01T00:00:00.000Z",
      periodEnd: "2026-07-31T23:59:59.000Z",
      responsible: "Ana",
      channel: "META"
    });

    expect(result.filters.description).toContain("2026-07-01");
    expect(result.executiveIndicators.find((item) => item.key === "tasks-completed")?.value).toBe(1);
    expect(result.executiveIndicators.find((item) => item.key === "leads")?.value).toBe(100);
    expect(result.operationalIndicators.find((item) => item.key === "conversions")?.value).toBe(12);
    expect(result.operationalIndicators.find((item) => item.key === "cpl")?.value).toBe(2.4);
    expect(result.executiveIndicators.find((item) => item.key === "roas")?.value).toBe(7.5);
    expect(result.charts.campaignsByStatus.items).toEqual([{ label: "ACTIVE", value: 1 }]);
    expect(result.tables.topCampaigns[0]).toEqual(expect.objectContaining({
      id: "campaign-1",
      revenue: 1800,
      leads: 100
    }));
  });

  it("supports comparison periods for trend analysis", async () => {
    mockFindWithSort(operationalScheduleModel, [
      {
        id: "op-1",
        launchId: "launch-1",
        title: "Publicar pagina",
        area: "CONTENT",
        responsible: "Ana",
        priority: "HIGH",
        status: "DONE",
        startsAt: new Date("2026-07-10T09:00:00.000Z"),
        dueAt: new Date("2026-07-10T18:00:00.000Z")
      }
    ]);

    const result = await reportsService.getAnalytics("user-1", {
      launchId: "launch-1",
      periodStart: "2026-07-15T00:00:00.000Z",
      periodEnd: "2026-07-31T23:59:59.000Z",
      comparePeriodStart: "2026-07-01T00:00:00.000Z",
      comparePeriodEnd: "2026-07-14T23:59:59.000Z"
    });

    expect(result.comparison).not.toBeNull();
    expect(result.comparison.leads).toHaveProperty("direction");
  });

  it("returns empty states when the filtered recut has no data", async () => {
    mockFindWithSort(operationalScheduleModel, []);
    mockFindWithSort(contentProductionModel, []);
    mockFindWithSort(publicationModel, []);
    mockFindWithSort(contentApprovalModel, []);
    mockFindWithSort(trafficCampaignModel, []);
    mockFindWithSort(trafficReportSnapshotModel, []);

    const result = await reportsService.getAnalytics("user-1", {
      launchId: "launch-1",
      periodStart: "2026-07-01T00:00:00.000Z",
      periodEnd: "2026-07-31T23:59:59.000Z"
    });

    expect(result.states.executive.empty).toBe(true);
    expect(result.states.tables.empty).toBe(true);
  });

  it("prepares export and print actions with visual feedback metadata", async () => {
    const result = await reportsService.exportAnalysis("user-1", {
      actionType: "EXPORT",
      format: "PDF",
      filters: {
        launchId: "launch-1",
        periodStart: "2026-07-01T00:00:00.000Z",
        periodEnd: "2026-07-31T23:59:59.000Z"
      }
    });

    expect(result.export).toEqual(expect.objectContaining({
      actionType: "EXPORT",
      format: "PDF",
      status: "READY"
    }));
  });

  it("saves and lists reusable report views and custom dashboards", async () => {
    reportViewModel.create.mockResolvedValue(buildView());
    mockFindWithSort(reportViewModel, [buildView()]);

    const created = await reportsService.saveView("user-1", {
      name: "Painel executivo semanal",
      description: "Visao principal",
      type: "CUSTOM_DASHBOARD",
      filters: {
        launchId: "launch-1",
        periodStart: "2026-07-01T00:00:00.000Z",
        periodEnd: "2026-07-31T23:59:59.000Z",
        channel: "META"
      },
      layout: {
        widgets: ["executiveIndicators", "topCampaigns"],
        shared: true
      }
    });

    const listed = await reportsService.listViews("user-1", "CUSTOM_DASHBOARD");

    expect(reportViewModel.create).toHaveBeenCalledWith(expect.objectContaining({
      ownerUserId: "user-1",
      type: "CUSTOM_DASHBOARD"
    }));
    expect(created.layout.shared).toBe(true);
    expect(reportViewModel.find).toHaveBeenCalledWith({
      ownerUserId: "user-1",
      active: true,
      type: "CUSTOM_DASHBOARD"
    });
    expect(listed).toHaveLength(1);
  });
});
