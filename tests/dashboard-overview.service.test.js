import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const permissionModel = {
  find: vi.fn()
};

const launchModel = {
  find: vi.fn(),
  findById: vi.fn()
};

const contentApprovalModel = {
  find: vi.fn()
};

const editorialCalendarItemModel = {
  find: vi.fn()
};

const trafficCampaignModel = {
  find: vi.fn()
};

const productionChecklistModel = {
  find: vi.fn()
};

const publicationModel = {
  find: vi.fn()
};

const auditEventModel = {
  find: vi.fn()
};

const userModel = {
  find: vi.fn()
};

const roleModel = {
  find: vi.fn()
};

const reelModel = {
  find: vi.fn()
};

const carouselModel = {
  find: vi.fn()
};

const storySequenceModel = {
  find: vi.fn()
};

const emailCampaignModel = {
  find: vi.fn()
};

const youtubeContentModel = {
  find: vi.fn()
};

const dashboardNotificationStateModel = {
  find: vi.fn(),
  updateOne: vi.fn(),
  bulkWrite: vi.fn()
};

const marketResearchModel = {
  findOne: vi.fn()
};

const competitorResearchModel = {
  find: vi.fn()
};

const avatarModel = {
  findOne: vi.fn()
};

const offerModel = {
  findOne: vi.fn()
};

const positioningModel = {
  findOne: vi.fn()
};

const editorialLineModel = {
  findOne: vi.fn()
};

const contentPlanModel = {
  findOne: vi.fn()
};

const smartScheduleModel = {
  findOne: vi.fn()
};

const expertApprovalModel = {
  findOne: vi.fn()
};

vi.mock("../src/models/permission.model.js", () => ({
  Permission: permissionModel
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/content-approval.model.js", () => ({
  ContentApproval: contentApprovalModel
}));

vi.mock("../src/models/editorial-calendar-item.model.js", () => ({
  EditorialCalendarItem: editorialCalendarItemModel
}));

vi.mock("../src/models/traffic-campaign.model.js", () => ({
  TrafficCampaign: trafficCampaignModel
}));

vi.mock("../src/models/production-checklist.model.js", () => ({
  ProductionChecklist: productionChecklistModel
}));

vi.mock("../src/models/publication.model.js", () => ({
  Publication: publicationModel
}));

vi.mock("../src/models/audit-event.model.js", () => ({
  AuditEvent: auditEventModel
}));

vi.mock("../src/models/user.model.js", () => ({
  User: userModel
}));

vi.mock("../src/models/role.model.js", () => ({
  Role: roleModel
}));

vi.mock("../src/models/reel.model.js", () => ({
  Reel: reelModel
}));

vi.mock("../src/models/carousel.model.js", () => ({
  Carousel: carouselModel
}));

vi.mock("../src/models/story-sequence.model.js", () => ({
  StorySequence: storySequenceModel
}));

vi.mock("../src/models/email-campaign.model.js", () => ({
  EmailCampaign: emailCampaignModel
}));

vi.mock("../src/models/youtube-content.model.js", () => ({
  YouTubeContent: youtubeContentModel
}));

vi.mock("../src/models/dashboard-notification-state.model.js", () => ({
  DashboardNotificationState: dashboardNotificationStateModel
}));

vi.mock("../src/models/market-research.model.js", () => ({
  MarketResearch: marketResearchModel
}));

vi.mock("../src/models/competitor-research.model.js", () => ({
  CompetitorResearch: competitorResearchModel
}));

vi.mock("../src/models/avatar.model.js", () => ({
  Avatar: avatarModel
}));

vi.mock("../src/models/offer.model.js", () => ({
  Offer: offerModel
}));

vi.mock("../src/models/positioning.model.js", () => ({
  Positioning: positioningModel
}));

vi.mock("../src/models/editorial-line.model.js", () => ({
  EditorialLine: editorialLineModel
}));

vi.mock("../src/models/content-plan.model.js", () => ({
  ContentPlan: contentPlanModel
}));

vi.mock("../src/models/smart-schedule.model.js", () => ({
  SmartSchedule: smartScheduleModel
}));

vi.mock("../src/models/expert-approval.model.js", () => ({
  ExpertApproval: expertApprovalModel
}));

const { dashboardService } = await import("../src/services/dashboard.service.js");

function createSortedQuery(value) {
  return {
    sort: vi.fn().mockResolvedValue(value)
  };
}

describe("dashboardService overview support", () => {
  const currentUser = {
    id: "user-1",
    name: "Ana Flow",
    email: "ana@flowjl.com",
    status: "ACTIVE"
  };

  const currentRole = {
    id: "role-admin",
    code: "ADMIN",
    name: "Administrador",
    permissionIds: ["perm-dashboard", "perm-launch", "perm-strategy", "perm-content", "perm-approval", "perm-traffic", "perm-publication", "perm-user-list"]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T12:00:00.000Z"));

    permissionModel.find.mockReturnValue(
      createSortedQuery([
        { code: "DASHBOARD_OVERVIEW_READ", module: "dashboard" },
        { code: "LAUNCH_READ", module: "launch" },
        { code: "MARKET_RESEARCH_CREATE", module: "strategy" },
        { code: "REEL_CREATE", module: "content" },
        { code: "CONTENT_APPROVAL_REVIEW", module: "approval" },
        { code: "TRAFFIC_CAMPAIGN_READ", module: "traffic" },
        { code: "PUBLICATION_READ", module: "publication" },
        { code: "USER_LIST", module: "user" }
      ])
    );

    launchModel.find.mockReturnValue(
      createSortedQuery([
        {
          id: "launch-active",
          name: "Flow QA Launch",
          expert: "Expert QA",
          product: "Mentoria QA",
          periodStart: new Date("2026-07-10T00:00:00.000Z"),
          periodEnd: new Date("2026-07-20T00:00:00.000Z"),
          updatedAt: new Date("2026-07-13T09:00:00.000Z"),
          createdAt: new Date("2026-07-01T00:00:00.000Z"),
          active: true
        },
        {
          id: "launch-upcoming",
          name: "Flow Cypress Launch",
          expert: "Expert Cypress",
          product: "Pos QA",
          periodStart: new Date("2026-07-18T00:00:00.000Z"),
          periodEnd: new Date("2026-07-28T00:00:00.000Z"),
          updatedAt: new Date("2026-07-12T09:00:00.000Z"),
          createdAt: new Date("2026-07-02T00:00:00.000Z"),
          active: true
        }
      ])
    );

    contentApprovalModel.find.mockReturnValue(
      createSortedQuery([
        {
          id: "approval-review",
          contentType: "REEL",
          contentId: "reel-1",
          launchId: "launch-active",
          currentStatus: "REVIEW",
          updatedAt: new Date("2026-07-13T11:30:00.000Z"),
          createdAt: new Date("2026-07-13T09:00:00.000Z"),
          active: true
        },
        {
          id: "approval-approved",
          contentType: "EMAIL_CAMPAIGN",
          contentId: "email-1",
          launchId: "launch-upcoming",
          currentStatus: "APPROVED",
          updatedAt: new Date("2026-07-13T10:30:00.000Z"),
          createdAt: new Date("2026-07-13T08:30:00.000Z"),
          active: true
        }
      ])
    );

    editorialCalendarItemModel.find.mockReturnValue(
      createSortedQuery([
        {
          id: "calendar-late",
          launchId: "launch-active",
          contentType: "REEL",
          contentId: "reel-1",
          channel: "Instagram",
          publishAt: new Date("2026-07-12T09:00:00.000Z"),
          responsible: "Ana Flow",
          notes: "Publicar com CTA",
          createdAt: new Date("2026-07-10T09:00:00.000Z"),
          active: true
        },
        {
          id: "calendar-soon",
          launchId: "launch-upcoming",
          contentType: "EMAIL_CAMPAIGN",
          contentId: "email-1",
          channel: "Email",
          publishAt: new Date("2026-07-14T09:00:00.000Z"),
          responsible: "Ana Flow",
          notes: "Disparo de aquecimento",
          createdAt: new Date("2026-07-13T08:00:00.000Z"),
          active: true
        }
      ])
    );

    trafficCampaignModel.find.mockReturnValue(
      createSortedQuery([
        {
          id: "campaign-active",
          launchId: "launch-active",
          name: "Meta QA",
          objective: "Gerar leads QA",
          channel: "META",
          status: "ACTIVE",
          budget: 1500,
          periodEnd: new Date("2026-07-20T00:00:00.000Z"),
          updatedAt: new Date("2026-07-13T07:00:00.000Z"),
          createdAt: new Date("2026-07-05T00:00:00.000Z"),
          active: true
        },
        {
          id: "campaign-paused",
          launchId: "launch-upcoming",
          name: "Google Cypress",
          objective: "Aquecer base",
          channel: "GOOGLE",
          status: "PAUSED",
          budget: 900,
          periodEnd: new Date("2026-07-17T00:00:00.000Z"),
          updatedAt: new Date("2026-07-13T06:00:00.000Z"),
          createdAt: new Date("2026-07-06T00:00:00.000Z"),
          active: true
        }
      ])
    );

    productionChecklistModel.find.mockReturnValue(
      createSortedQuery([
        {
          id: "checklist-1",
          items: [
            { id: "item-1", label: "Briefing", required: true, completed: false },
            { id: "item-2", label: "Revisao", required: true, completed: true }
          ],
          updatedAt: new Date("2026-07-13T05:00:00.000Z"),
          createdAt: new Date("2026-07-10T00:00:00.000Z"),
          active: true
        }
      ])
    );

    publicationModel.find.mockReturnValue(createSortedQuery([]));
    auditEventModel.find.mockReturnValue(
      createSortedQuery([
        {
          id: "audit-1",
          action: "LAUNCH_CREATED",
          targetType: "LAUNCH",
          targetId: "launch-active",
          actorUserId: "user-1",
          context: {},
          occurredAt: new Date("2026-07-13T04:00:00.000Z")
        }
      ])
    );
    userModel.find.mockReturnValue(
      createSortedQuery([
        currentUser,
        {
          id: "user-2",
          name: "Bruno Ops",
          email: "bruno@flowjl.com",
          status: "ACTIVE",
          roleId: "role-ops",
          lastLoginAt: new Date("2026-07-13T02:00:00.000Z"),
          createdAt: new Date("2026-07-01T00:00:00.000Z"),
          updatedAt: new Date("2026-07-13T02:00:00.000Z")
        }
      ])
    );
    roleModel.find.mockReturnValue(
      createSortedQuery([
        { id: "role-admin", code: "ADMIN", name: "Administrador", active: true },
        { id: "role-ops", code: "OPERATIONS", name: "Operacoes", active: true }
      ])
    );
    reelModel.find.mockReturnValue(
      createSortedQuery([
        {
          id: "reel-1",
          theme: "Flow QA",
          objective: "Atrair leads",
          operationalStatus: "IN_REVIEW",
          hook: "Ganhe clareza",
          cta: "Comente QA",
          updatedAt: new Date("2026-07-13T03:00:00.000Z"),
          createdAt: new Date("2026-07-10T00:00:00.000Z"),
          active: true
        }
      ])
    );
    carouselModel.find.mockReturnValue(createSortedQuery([]));
    storySequenceModel.find.mockReturnValue(createSortedQuery([]));
    emailCampaignModel.find.mockReturnValue(
      createSortedQuery([
        {
          id: "email-1",
          subject: "Flow QA aquecimento",
          objective: "Aquecer base",
          cta: "Entrar no grupo",
          type: "EVENT",
          status: "APPROVED",
          updatedAt: new Date("2026-07-13T02:30:00.000Z"),
          createdAt: new Date("2026-07-11T00:00:00.000Z"),
          active: true
        }
      ])
    );
    youtubeContentModel.find.mockReturnValue(createSortedQuery([]));
    dashboardNotificationStateModel.find.mockResolvedValue([
      {
        notificationId: "approval-approved:approval-approved",
        readAt: new Date("2026-07-13T11:45:00.000Z")
      }
    ]);
    dashboardNotificationStateModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    dashboardNotificationStateModel.bulkWrite.mockResolvedValue({ result: { ok: 1 } });

    marketResearchModel.findOne.mockReturnValue(createSortedQuery(null));
    competitorResearchModel.find.mockReturnValue(createSortedQuery([]));
    avatarModel.findOne.mockReturnValue(createSortedQuery(null));
    offerModel.findOne.mockReturnValue(createSortedQuery(null));
    positioningModel.findOne.mockReturnValue(createSortedQuery(null));
    editorialLineModel.findOne.mockReturnValue(createSortedQuery(null));
    contentPlanModel.findOne.mockReturnValue(createSortedQuery(null));
    smartScheduleModel.findOne.mockReturnValue(createSortedQuery(null));
    expertApprovalModel.findOne.mockReturnValue(createSortedQuery(null));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds the dashboard overview payload with shell, metrics and module counters", async () => {
    const result = await dashboardService.getOverview({
      currentUser,
      currentRole
    });

    expect(result.currentUser.role.code).toBe("ADMIN");
    expect(result.shell.sidebar.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "dashboard", enabled: true }),
        expect.objectContaining({ key: "launches", enabled: true }),
        expect.objectContaining({ key: "settings", enabled: true })
      ])
    );
    expect(result.overview.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "active-launches", value: 1 }),
        expect.objectContaining({ key: "pending-tasks", value: 1 }),
        expect.objectContaining({ key: "pending-approvals", value: 1 }),
        expect.objectContaining({ key: "traffic-investment", value: 1500 }),
        expect.objectContaining({ key: "leads-generated", state: "EMPTY" })
      ])
    );
    expect(result.notifications.unread).toBeGreaterThanOrEqual(4);
    expect(result.overview.sections.pendingApprovals).toHaveLength(1);
    expect(result.overview.sections.upcomingActivities).toHaveLength(1);
    expect(result.overview.sections.recentActivities[0].action).toBe("LAUNCH_CREATED");
  });

  it("returns notifications with persisted read state per user", async () => {
    const result = await dashboardService.listNotifications({
      currentUser,
      currentRole
    });

    expect(dashboardNotificationStateModel.find).toHaveBeenCalledWith({
      userId: "user-1",
      notificationId: {
        $in: expect.arrayContaining(["approval-approved:approval-approved", "approval:approval-review:REVIEW"])
      }
    });
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "approval-approved:approval-approved",
          readAt: new Date("2026-07-13T11:45:00.000Z")
        }),
        expect.objectContaining({
          id: "approval:approval-review:REVIEW",
          readAt: null
        })
      ])
    );
  });

  it("marks a dashboard notification as read", async () => {
    const result = await dashboardService.markNotificationAsRead({
      currentUser,
      currentRole,
      notificationId: "approval:approval-review:REVIEW"
    });

    expect(dashboardNotificationStateModel.updateOne).toHaveBeenCalledWith(
      {
        userId: "user-1",
        notificationId: "approval:approval-review:REVIEW"
      },
      {
        $set: {
          readAt: expect.any(Date)
        }
      },
      {
        upsert: true
      }
    );
    expect(result.id).toBe("approval:approval-review:REVIEW");
    expect(result.readAt).toBeInstanceOf(Date);
  });

  it("searches across launches, strategies, contents, users, activities, events and campaigns", async () => {
    const result = await dashboardService.search({
      currentRole,
      query: "Flow"
    });

    expect(result.query).toBe("Flow");
    expect(result.counts.launches).toBeGreaterThanOrEqual(1);
    expect(result.counts.strategies).toBeGreaterThanOrEqual(1);
    expect(result.counts.contents).toBeGreaterThanOrEqual(1);
    expect(result.counts.users).toBeGreaterThanOrEqual(1);
    expect(result.counts.campaigns).toBeGreaterThanOrEqual(1);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityType: "LAUNCH", title: "Flow QA Launch" }),
        expect.objectContaining({ entityType: "STRATEGY", title: "Estrategia de Flow QA Launch" }),
        expect.objectContaining({ entityType: "CONTENT", title: "Flow QA" }),
        expect.objectContaining({ entityType: "USER", title: "Ana Flow" }),
        expect.objectContaining({ entityType: "CAMPAIGN", title: "Meta QA" })
      ])
    );
  });
});
