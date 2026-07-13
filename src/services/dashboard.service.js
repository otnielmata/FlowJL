import { AuditEvent } from "../models/audit-event.model.js";
import { Avatar } from "../models/avatar.model.js";
import { Carousel } from "../models/carousel.model.js";
import { CompetitorResearch } from "../models/competitor-research.model.js";
import { ContentApproval } from "../models/content-approval.model.js";
import { ContentPlan } from "../models/content-plan.model.js";
import { DashboardNotificationState } from "../models/dashboard-notification-state.model.js";
import { EditorialCalendarItem } from "../models/editorial-calendar-item.model.js";
import { EditorialLine } from "../models/editorial-line.model.js";
import { EmailCampaign } from "../models/email-campaign.model.js";
import { ExpertApproval } from "../models/expert-approval.model.js";
import { Launch } from "../models/launch.model.js";
import { MarketResearch } from "../models/market-research.model.js";
import { Offer } from "../models/offer.model.js";
import { Permission } from "../models/permission.model.js";
import { Positioning } from "../models/positioning.model.js";
import { ProductionChecklist } from "../models/production-checklist.model.js";
import { Publication } from "../models/publication.model.js";
import { Reel } from "../models/reel.model.js";
import { Role } from "../models/role.model.js";
import { SmartSchedule } from "../models/smart-schedule.model.js";
import { StorySequence } from "../models/story-sequence.model.js";
import { TrafficCampaign } from "../models/traffic-campaign.model.js";
import { User } from "../models/user.model.js";
import { YouTubeContent } from "../models/youtube-content.model.js";

const strategyStepDefinitions = [
  { key: "marketResearch", label: "Pesquisa de mercado" },
  { key: "competitorResearch", label: "Pesquisa de concorrentes" },
  { key: "avatar", label: "Avatar" },
  { key: "offer", label: "Oferta" },
  { key: "positioning", label: "Posicionamento" },
  { key: "editorialLine", label: "Linha editorial" },
  { key: "contentPlan", label: "Plano de conteudo" },
  { key: "smartSchedule", label: "Cronograma inteligente" },
  { key: "expertApproval", label: "Aprovacao do expert" }
];

const completedActivityStatuses = new Set(["DONE", "COMPLETED", "APPROVED", "PUBLISHED"]);
const notificationPriorityOrder = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2
};
const finalContentStatuses = new Set(["APPROVED", "PUBLISHED", "SENT", "SCHEDULED"]);
const finalApprovalStatuses = new Set(["APPROVED", "PUBLISHED"]);
const dashboardThemeModes = ["LIGHT", "DARK", "SYSTEM"];
const dashboardSearchShortcuts = ["Ctrl+K", "Command+K"];

const sidebarModuleDefinitions = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: "layout-dashboard",
    requiredPermissions: ["DASHBOARD_OVERVIEW_READ", "STRATEGIST_DASHBOARD_READ"],
    implemented: true
  },
  {
    key: "strategies",
    label: "Estrategia Digital",
    href: "/estrategias",
    icon: "target",
    requiredPermissions: [
      "STRATEGIST_DASHBOARD_READ",
      "MARKET_RESEARCH_CREATE",
      "CONTENT_PLAN_CREATE",
      "AVATAR_CREATE",
      "OFFER_CREATE",
      "POSITIONING_CREATE",
      "EDITORIAL_LINE_CREATE",
      "SMART_SCHEDULE_CREATE"
    ],
    implemented: true
  },
  {
    key: "launches",
    label: "Lancamentos",
    href: "/lancamentos",
    icon: "rocket",
    requiredPermissions: ["LAUNCH_READ", "LAUNCH_CREATE"],
    implemented: true
  },
  {
    key: "schedules",
    label: "Cronogramas",
    href: "/cronogramas",
    icon: "calendar-range",
    requiredPermissions: [
      "SMART_SCHEDULE_CREATE",
      "SMART_SCHEDULE_UPDATE",
      "EDITORIAL_CALENDAR_READ",
      "EDITORIAL_CALENDAR_CREATE",
      "PRODUCTION_CHECKLIST_READ"
    ],
    implemented: true
  },
  {
    key: "contents",
    label: "Producao de Conteudo",
    href: "/conteudos",
    icon: "clapperboard",
    requiredPermissions: [
      "CONTENT_IDEA_READ",
      "REEL_CREATE",
      "CAROUSEL_CREATE",
      "STORY_SEQUENCE_CREATE",
      "EMAIL_CAMPAIGN_READ",
      "YOUTUBE_CONTENT_CREATE"
    ],
    implemented: true
  },
  {
    key: "social-media",
    label: "Social Media",
    href: "/social-media",
    icon: "images",
    requiredPermissions: ["PUBLICATION_READ", "PUBLICATION_CREATE", "EDITORIAL_CALENDAR_READ"],
    implemented: true
  },
  {
    key: "traffic",
    label: "Trafego Pago",
    href: "/trafego",
    icon: "badge-percent",
    requiredPermissions: ["TRAFFIC_CAMPAIGN_READ", "TRAFFIC_CREATIVE_READ", "TRAFFIC_PIXEL_READ"],
    implemented: true
  },
  {
    key: "operations",
    label: "Operacoes",
    href: "/operacoes",
    icon: "clipboard-list",
    requiredPermissions: ["PRODUCTION_CHECKLIST_READ", "EXTERNAL_INTEGRATION_READ", "EMAIL_CAMPAIGN_READ"],
    implemented: true
  },
  {
    key: "approvals",
    label: "Aprovacoes",
    href: "/aprovacoes",
    icon: "badge-check",
    requiredPermissions: [
      "CONTENT_APPROVAL_REVIEW",
      "CONTENT_APPROVAL_APPROVE",
      "CONTENT_APPROVAL_PUBLISH",
      "EXPERT_APPROVAL_DECIDE",
      "EXPERT_APPROVAL_SUBMIT"
    ],
    implemented: true
  },
  {
    key: "ai",
    label: "Inteligencia Artificial",
    href: "/ia",
    icon: "sparkles",
    requiredPermissions: ["COPYWRITING_GENERATE"],
    implemented: false
  },
  {
    key: "reports",
    label: "Relatorios",
    href: "/relatorios",
    icon: "line-chart",
    requiredPermissions: ["REPORTS_READ"],
    implemented: true
  },
  {
    key: "settings",
    label: "Configuracoes",
    href: "/configuracoes",
    icon: "settings",
    requiredPermissions: ["USER_LIST", "ROLE_READ", "PERMISSION_READ"],
    implemented: false
  }
];

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function hasCurrentEntity(entity) {
  return Boolean(entity);
}

function buildStepStatus(stepKey, entity) {
  if (stepKey === "expertApproval") {
    if (!entity) {
      return "PENDING";
    }

    if (entity.status === "APPROVED") {
      return "COMPLETED";
    }

    if (entity.status === "IN_REVIEW") {
      return "IN_REVIEW";
    }

    if (entity.status === "REJECTED") {
      return "REJECTED";
    }
  }

  return entity ? "COMPLETED" : "PENDING";
}

function getEntityUpdatedAt(entity) {
  return entity?.updatedAt ?? entity?.createdAt ?? null;
}

function toPublicStep(definition, entity) {
  return {
    key: definition.key,
    label: definition.label,
    status: buildStepStatus(definition.key, entity),
    version: entity?.version ?? null,
    updatedAt: getEntityUpdatedAt(entity)
  };
}

function isCompletedActivity(activity) {
  return completedActivityStatuses.has(activity.status.trim().toUpperCase());
}

function buildStageStatus(activities, now) {
  const grouped = new Map();

  for (const activity of activities) {
    const group = grouped.get(activity.stage) ?? [];
    group.push(activity);
    grouped.set(activity.stage, group);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([stage, groupedActivities]) => {
      const delayedActivities = groupedActivities.filter((activity) => !isCompletedActivity(activity) && normalizeDate(activity.dueAt) < now);
      const completedActivities = groupedActivities.filter((activity) => isCompletedActivity(activity));
      const pendingActivities = groupedActivities.length - completedActivities.length;
      const orderedDueDates = groupedActivities
        .map((activity) => normalizeDate(activity.dueAt))
        .filter((dueAt) => dueAt)
        .sort((left, right) => left.getTime() - right.getTime());

      let status = "PENDING";

      if (groupedActivities.length > 0 && pendingActivities === 0) {
        status = "COMPLETED";
      } else if (delayedActivities.length > 0) {
        status = "DELAYED";
      } else if (completedActivities.length > 0) {
        status = "IN_PROGRESS";
      }

      return {
        stage,
        status,
        totalActivities: groupedActivities.length,
        completedActivities: completedActivities.length,
        pendingActivities,
        delayedActivities: delayedActivities.length,
        progressPercentage: groupedActivities.length === 0 ? 0 : Math.round((completedActivities.length / groupedActivities.length) * 100),
        nextDueAt: orderedDueDates.find((dueAt) => dueAt >= now) ?? null,
        lastDueAt: orderedDueDates.at(-1) ?? null
      };
    });
}

function computeLaunchLastUpdatedAt(sources) {
  const orderedDates = sources
    .map((source) => getEntityUpdatedAt(source))
    .filter((value) => value)
    .sort((left, right) => right.getTime() - left.getTime());

  return orderedDates[0] ?? null;
}

function buildLaunchDashboard(launch, data, now) {
  const steps = strategyStepDefinitions.map((definition) => toPublicStep(definition, data[definition.key]));
  const completedSteps = steps.filter((step) => step.status === "COMPLETED").length;
  const stageStatus = buildStageStatus(data.smartSchedule?.activities ?? [], now);
  const totalActivities = data.smartSchedule?.activities.length ?? 0;
  const completedActivities = (data.smartSchedule?.activities ?? []).filter((activity) => isCompletedActivity(activity)).length;
  const delayedActivities = (data.smartSchedule?.activities ?? []).filter((activity) => !isCompletedActivity(activity) && normalizeDate(activity.dueAt) < now).length;
  const pendingSteps = steps.filter((step) => step.status !== "COMPLETED").length;
  const pendingActivities = totalActivities - completedActivities;

  return {
    launch: {
      id: launch.id,
      name: launch.name,
      expert: launch.expert,
      product: launch.product,
      baseDate: launch.baseDate,
      periodStart: launch.periodStart,
      periodEnd: launch.periodEnd
    },
    progressPercentage: Math.round((completedSteps / strategyStepDefinitions.length) * 100),
    pendingCount: pendingSteps + pendingActivities,
    delayedCount: delayedActivities,
    approvalStatus: data.expertApproval?.status ?? "PENDING",
    strategySteps: steps,
    stageStatus,
    metrics: {
      totalSteps: strategyStepDefinitions.length,
      completedSteps,
      totalActivities,
      completedActivities,
      pendingActivities,
      delayedActivities
    },
    lastUpdatedAt: computeLaunchLastUpdatedAt([launch, ...Object.values(data)])
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRegex(query) {
  return new RegExp(escapeRegExp(query.trim()), "i");
}

function hasAnyPermission(permissionCodes, requiredPermissions) {
  return requiredPermissions.some((permissionCode) => permissionCodes.has(permissionCode));
}

function sortNotifications(left, right) {
  const leftPriority = notificationPriorityOrder[left.priority] ?? notificationPriorityOrder.LOW;
  const rightPriority = notificationPriorityOrder[right.priority] ?? notificationPriorityOrder.LOW;

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  return right.occurredAt.getTime() - left.occurredAt.getTime();
}

function classifyLaunchStatus(launch, now) {
  const start = normalizeDate(launch.periodStart);
  const end = normalizeDate(launch.periodEnd);

  if (start && start > now) {
    return "UPCOMING";
  }

  if (end && end < now) {
    return "COMPLETED";
  }

  return "ACTIVE";
}

function resolveContentStatus(content) {
  return content.operationalStatus ?? content.status ?? "DRAFT";
}

function isContentInProduction(content) {
  return !finalContentStatuses.has(resolveContentStatus(content));
}

function buildSidebarItems(permissionCodes, pendingByModule) {
  return sidebarModuleDefinitions.map((definition) => ({
    key: definition.key,
    label: definition.label,
    href: definition.href,
    icon: definition.icon,
    enabled: hasAnyPermission(permissionCodes, definition.requiredPermissions),
    pendingCount: pendingByModule[definition.key] ?? 0,
    implemented: definition.implemented
  }));
}

function toCard({ key, title, value, description, moduleKey, route, trend = null, state = "READY" }) {
  return {
    key,
    title,
    value,
    description,
    moduleKey,
    route,
    trend,
    state
  };
}

function summarizeByKey(items, keyResolver) {
  return items.reduce((accumulator, item) => {
    const key = keyResolver(item);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

function toChartSeriesRecord(input) {
  return Object.entries(input).map(([label, value]) => ({
    label,
    value
  }));
}

function buildCharts({ launches, campaigns, approvals, editorialItems }) {
  const launchStatusSeries = toChartSeriesRecord(
    summarizeByKey(launches, (launch) => classifyLaunchStatus(launch, new Date()))
  );
  const campaignStatusSeries = toChartSeriesRecord(summarizeByKey(campaigns, (campaign) => campaign.status));
  const approvalStatusSeries = toChartSeriesRecord(summarizeByKey(approvals, (approval) => approval.currentStatus));
  const publicationChannelSeries = toChartSeriesRecord(summarizeByKey(editorialItems, (item) => item.channel));

  return [
    {
      key: "launch-status-distribution",
      title: "Distribuicao de lancamentos por status",
      state: launchStatusSeries.length > 0 ? "READY" : "EMPTY",
      series: launchStatusSeries
    },
    {
      key: "campaign-status-distribution",
      title: "Distribuicao de campanhas por status",
      state: campaignStatusSeries.length > 0 ? "READY" : "EMPTY",
      series: campaignStatusSeries
    },
    {
      key: "approval-status-distribution",
      title: "Distribuicao de aprovacoes por status",
      state: approvalStatusSeries.length > 0 ? "READY" : "EMPTY",
      series: approvalStatusSeries
    },
    {
      key: "publication-channel-distribution",
      title: "Publicacoes planejadas por canal",
      state: publicationChannelSeries.length > 0 ? "READY" : "EMPTY",
      series: publicationChannelSeries
    }
  ];
}

function buildApprovalItems(approvals, launchesById) {
  return approvals
    .filter((approval) => !finalApprovalStatuses.has(approval.currentStatus))
    .slice(0, 5)
    .map((approval) => ({
      id: approval.id,
      contentType: approval.contentType,
      contentId: approval.contentId,
      currentStatus: approval.currentStatus,
      launchId: approval.launchId ?? null,
      launchName: launchesById[approval.launchId]?.name ?? null,
      updatedAt: approval.updatedAt,
      createdAt: approval.createdAt
    }));
}

function buildUpcomingActivities(editorialItems, launchesById, now) {
  return editorialItems
    .filter((item) => normalizeDate(item.publishAt) >= now)
    .sort((left, right) => normalizeDate(left.publishAt) - normalizeDate(right.publishAt))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      contentType: item.contentType,
      contentId: item.contentId,
      channel: item.channel,
      publishAt: item.publishAt,
      responsible: item.responsible,
      launchId: item.launchId,
      launchName: launchesById[item.launchId]?.name ?? null,
      notes: item.notes ?? null
    }));
}

function buildOperationalAlerts({ editorialItems, campaigns, launches, now }) {
  const delayedActivities = editorialItems
    .filter((item) => normalizeDate(item.publishAt) < now)
    .map((item) => ({
      id: `activity-delay:${item.id}`,
      type: "ACTIVITY_DELAYED",
      severity: "HIGH",
      title: `Atividade atrasada em ${item.channel}`,
      description: `${item.contentType} do lancamento ${item.launchId} deveria ter ocorrido antes de agora.`,
      moduleKey: "schedules",
      occurredAt: item.publishAt
    }));

  const campaignAlerts = campaigns
    .filter((campaign) => campaign.status === "PAUSED" || normalizeDate(campaign.periodEnd) < now)
    .map((campaign) => ({
      id: `campaign-alert:${campaign.id}:${campaign.status}`,
      type: "CAMPAIGN_ALERT",
      severity: campaign.status === "PAUSED" ? "MEDIUM" : "HIGH",
      title: `Campanha ${campaign.name} em alerta`,
      description:
        campaign.status === "PAUSED"
          ? "A campanha esta pausada e precisa de acompanhamento."
          : "A campanha ultrapassou o periodo previsto e precisa de revisao.",
      moduleKey: "traffic",
      occurredAt: campaign.updatedAt ?? campaign.periodEnd
    }));

  const upcomingLaunches = launches
    .filter((launch) => {
      const start = normalizeDate(launch.periodStart);
      if (!start) {
        return false;
      }

      const diff = start.getTime() - now.getTime();
      return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
    })
    .map((launch) => ({
      id: `launch-upcoming:${launch.id}`,
      type: "LAUNCH_UPCOMING",
      severity: "LOW",
      title: `Lancamento ${launch.name} proximo`,
      description: `O lancamento inicia em ${normalizeDate(launch.periodStart)?.toISOString()}.`,
      moduleKey: "launches",
      occurredAt: launch.periodStart
    }));

  return [...delayedActivities, ...campaignAlerts, ...upcomingLaunches]
    .sort((left, right) => normalizeDate(right.occurredAt) - normalizeDate(left.occurredAt))
    .slice(0, 6);
}

function buildRecentActivities(auditEvents) {
  return auditEvents.slice(0, 6).map((event) => ({
    id: event.id,
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId,
    actorUserId: event.actorUserId ?? null,
    occurredAt: event.occurredAt,
    context: event.context ?? {}
  }));
}

function buildTeamSummary(users, rolesById) {
  const summaryByRole = users.reduce((accumulator, user) => {
    const role = rolesById[user.roleId];
    const key = role?.code ?? "UNASSIGNED";
    const current = accumulator[key] ?? {
      roleCode: key,
      roleName: role?.name ?? "Sem cargo",
      users: 0,
      lastLoginAt: null
    };

    current.users += 1;

    if (user.lastLoginAt && (!current.lastLoginAt || user.lastLoginAt > current.lastLoginAt)) {
      current.lastLoginAt = user.lastLoginAt;
    }

    accumulator[key] = current;
    return accumulator;
  }, {});

  return Object.values(summaryByRole).sort((left, right) => right.users - left.users);
}

function getNotificationSources({ approvals, editorialItems, campaigns, launches, currentUser, now }) {
  const pendingApprovalNotifications = approvals
    .filter((approval) => !finalApprovalStatuses.has(approval.currentStatus))
    .map((approval) => ({
      id: `approval:${approval.id}:${approval.currentStatus}`,
      type: "APPROVAL_PENDING",
      title: `Nova aprovacao em ${approval.currentStatus}`,
      message: `O item ${approval.contentType} exige acompanhamento da fila de aprovacoes.`,
      moduleKey: "approvals",
      relatedEntityType: "CONTENT_APPROVAL",
      relatedEntityId: approval.id,
      priority: approval.currentStatus === "EXPERT" ? "HIGH" : "MEDIUM",
      occurredAt: normalizeDate(approval.updatedAt) ?? normalizeDate(approval.createdAt) ?? now
    }));

  const approvedContentNotifications = approvals
    .filter((approval) => approval.currentStatus === "APPROVED")
    .map((approval) => ({
      id: `approval-approved:${approval.id}`,
      type: "CONTENT_APPROVED",
      title: `${approval.contentType} aprovado`,
      message: "O conteudo pode seguir para a proxima etapa operacional.",
      moduleKey: "approvals",
      relatedEntityType: "CONTENT_APPROVAL",
      relatedEntityId: approval.id,
      priority: "LOW",
      occurredAt: normalizeDate(approval.updatedAt) ?? now
    }));

  const delayedActivityNotifications = editorialItems
    .filter((item) => {
      const publishAt = normalizeDate(item.publishAt);
      return publishAt && publishAt < now;
    })
    .map((item) => ({
      id: `activity-delayed:${item.id}`,
      type: "TASK_DELAYED",
      title: `Tarefa atrasada em ${item.channel}`,
      message: `${item.contentType} deveria ter sido executado antes de ${normalizeDate(item.publishAt)?.toISOString()}.`,
      moduleKey: "schedules",
      relatedEntityType: "EDITORIAL_CALENDAR_ITEM",
      relatedEntityId: item.id,
      priority: "HIGH",
      occurredAt: normalizeDate(item.publishAt) ?? now
    }));

  const assignedActivityNotifications = editorialItems
    .filter((item) => {
      const responsible = item.responsible?.trim()?.toLowerCase();
      const userName = currentUser.name?.trim()?.toLowerCase();
      const publishAt = normalizeDate(item.publishAt);

      return responsible && userName && responsible === userName && publishAt && publishAt >= now;
    })
    .map((item) => ({
      id: `activity-assigned:${item.id}:${currentUser.id}`,
      type: "ACTIVITY_ASSIGNED",
      title: `Atividade atribuida para ${currentUser.name}`,
      message: `${item.contentType} agendado em ${item.channel}.`,
      moduleKey: "schedules",
      relatedEntityType: "EDITORIAL_CALENDAR_ITEM",
      relatedEntityId: item.id,
      priority: "MEDIUM",
      occurredAt: normalizeDate(item.createdAt) ?? normalizeDate(item.publishAt) ?? now
    }));

  const upcomingEventNotifications = editorialItems
    .filter((item) => {
      const publishAt = normalizeDate(item.publishAt);

      if (!publishAt || publishAt < now) {
        return false;
      }

      return publishAt.getTime() - now.getTime() <= 48 * 60 * 60 * 1000;
    })
    .map((item) => ({
      id: `event-upcoming:${item.id}`,
      type: "EVENT_UPCOMING",
      title: `Evento proximo em ${item.channel}`,
      message: `${item.contentType} sera publicado em breve.`,
      moduleKey: "social-media",
      relatedEntityType: "EDITORIAL_CALENDAR_ITEM",
      relatedEntityId: item.id,
      priority: "MEDIUM",
      occurredAt: normalizeDate(item.publishAt) ?? now
    }));

  const campaignAlertNotifications = campaigns
    .filter((campaign) => campaign.status === "PAUSED" || normalizeDate(campaign.periodEnd) < now)
    .map((campaign) => ({
      id: `campaign-alert:${campaign.id}:${campaign.status}`,
      type: "CAMPAIGN_ALERT",
      title: `Campanha ${campaign.name} em alerta`,
      message:
        campaign.status === "PAUSED"
          ? "A campanha esta pausada e precisa de acompanhamento."
          : "A campanha encerrou o periodo planejado e ainda demanda revisao.",
      moduleKey: "traffic",
      relatedEntityType: "TRAFFIC_CAMPAIGN",
      relatedEntityId: campaign.id,
      priority: campaign.status === "PAUSED" ? "MEDIUM" : "HIGH",
      occurredAt: normalizeDate(campaign.updatedAt) ?? normalizeDate(campaign.periodEnd) ?? now
    }));

  const upcomingLaunchNotifications = launches
    .filter((launch) => {
      const start = normalizeDate(launch.periodStart);

      if (!start || start < now) {
        return false;
      }

      return start.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000;
    })
    .map((launch) => ({
      id: `launch-upcoming:${launch.id}`,
      type: "LAUNCH_UPCOMING",
      title: `Lancamento ${launch.name} se aproxima`,
      message: `O periodo do lancamento inicia em ${normalizeDate(launch.periodStart)?.toISOString()}.`,
      moduleKey: "launches",
      relatedEntityType: "LAUNCH",
      relatedEntityId: launch.id,
      priority: "LOW",
      occurredAt: normalizeDate(launch.periodStart) ?? now
    }));

  return [
    ...pendingApprovalNotifications,
    ...approvedContentNotifications,
    ...delayedActivityNotifications,
    ...assignedActivityNotifications,
    ...upcomingEventNotifications,
    ...campaignAlertNotifications,
    ...upcomingLaunchNotifications
  ].sort(sortNotifications);
}

function toOverviewSearchItem(item) {
  return {
    id: item.id,
    entityType: item.entityType,
    moduleKey: item.moduleKey,
    title: item.title,
    subtitle: item.subtitle ?? null,
    status: item.status ?? null,
    route: item.route,
    occurredAt: item.occurredAt ?? null
  };
}

async function findLaunches(filterLaunchId) {
  if (filterLaunchId) {
    const launch = await Launch.findById(filterLaunchId);

    if (!launch || launch.active === false) {
      throw {
        statusCode: 404,
        message: "Launch not found"
      };
    }

    return [launch];
  }

  return Launch.find({ active: true }).sort({ baseDate: -1, createdAt: -1 });
}

async function loadLaunchData(launchId) {
  const [
    marketResearch,
    competitorResearchEntries,
    avatar,
    offer,
    positioning,
    editorialLine,
    contentPlan,
    smartSchedule,
    expertApproval
  ] = await Promise.all([
    MarketResearch.findOne({ launchId }).sort({ version: -1, createdAt: -1 }),
    CompetitorResearch.find({ launchId, active: true }).sort({ updatedAt: -1 }),
    Avatar.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    Offer.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    Positioning.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    EditorialLine.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    ContentPlan.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    SmartSchedule.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    ExpertApproval.findOne({ launchId, isCurrent: true }).sort({ version: -1 })
  ]);

  return {
    marketResearch,
    competitorResearch: competitorResearchEntries.length > 0 ? { updatedAt: competitorResearchEntries[0].updatedAt ?? competitorResearchEntries[0].createdAt } : null,
    avatar: hasCurrentEntity(avatar) ? avatar : null,
    offer: hasCurrentEntity(offer) ? offer : null,
    positioning: hasCurrentEntity(positioning) ? positioning : null,
    editorialLine: hasCurrentEntity(editorialLine) ? editorialLine : null,
    contentPlan: hasCurrentEntity(contentPlan) ? contentPlan : null,
    smartSchedule: hasCurrentEntity(smartSchedule) ? smartSchedule : null,
    expertApproval: hasCurrentEntity(expertApproval) ? expertApproval : null
  };
}

async function listActivePermissions(role) {
  return Permission.find({
    _id: {
      $in: role.permissionIds ?? []
    },
    active: true
  }).sort({ module: 1, code: 1 });
}

async function loadDashboardOverviewSources() {
  const [
    launches,
    approvals,
    editorialItems,
    campaigns,
    checklists,
    publications,
    auditEvents,
    users,
    roles,
    reels,
    carousels,
    stories,
    emails,
    youtubeContents
  ] = await Promise.all([
    Launch.find({ active: true }).sort({ periodStart: 1, createdAt: -1 }),
    ContentApproval.find({ active: true }).sort({ updatedAt: -1, createdAt: -1 }),
    EditorialCalendarItem.find({ active: true }).sort({ publishAt: 1, createdAt: -1 }),
    TrafficCampaign.find({ active: true }).sort({ periodStart: -1, createdAt: -1 }),
    ProductionChecklist.find({ active: true }).sort({ updatedAt: -1, createdAt: -1 }),
    Publication.find({ active: true }).sort({ publishAt: -1, createdAt: -1 }),
    AuditEvent.find().sort({ occurredAt: -1 }),
    User.find({ status: "ACTIVE" }).sort({ createdAt: -1 }),
    Role.find({ active: true }).sort({ name: 1 }),
    Reel.find({ active: true }).sort({ updatedAt: -1, createdAt: -1 }),
    Carousel.find({ active: true }).sort({ updatedAt: -1, createdAt: -1 }),
    StorySequence.find({ active: true }).sort({ updatedAt: -1, createdAt: -1 }),
    EmailCampaign.find({ active: true }).sort({ updatedAt: -1, createdAt: -1 }),
    YouTubeContent.find({ active: true }).sort({ updatedAt: -1, createdAt: -1 })
  ]);

  return {
    launches,
    approvals,
    editorialItems,
    campaigns,
    checklists,
    publications,
    auditEvents,
    users,
    roles,
    contents: {
      reels,
      carousels,
      stories,
      emails,
      youtubeContents
    }
  };
}

function flattenContents(contents) {
  return [
    ...(contents.reels ?? []),
    ...(contents.carousels ?? []),
    ...(contents.stories ?? []),
    ...(contents.emails ?? []),
    ...(contents.youtubeContents ?? [])
  ];
}

function buildOverviewPayload({ currentUser, currentRole, permissionDocs, sources, notifications, now }) {
  const launchesById = Object.fromEntries(sources.launches.map((launch) => [launch.id, launch]));
  const rolesById = Object.fromEntries(sources.roles.map((role) => [role.id ?? role._id, role]));
  const permissionCodes = new Set(permissionDocs.map((permission) => permission.code));
  const pendingByModule = notifications.reduce((accumulator, notification) => {
    if (!notification.readAt) {
      accumulator[notification.moduleKey] = (accumulator[notification.moduleKey] ?? 0) + 1;
    }

    return accumulator;
  }, {});
  const sidebarItems = buildSidebarItems(permissionCodes, pendingByModule);
  const contents = flattenContents(sources.contents);
  const activeCampaigns = sources.campaigns.filter((campaign) => ["PLANNED", "ACTIVE"].includes(campaign.status));
  const contentsInProduction = contents.filter((content) => isContentInProduction(content)).length;
  const pendingApprovals = sources.approvals.filter((approval) => !finalApprovalStatuses.has(approval.currentStatus)).length;
  const delayedActivities = sources.editorialItems.filter((item) => normalizeDate(item.publishAt) < now).length;
  const upcomingEvents = sources.editorialItems.filter((item) => {
    const publishAt = normalizeDate(item.publishAt);

    return publishAt && publishAt >= now && publishAt.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000;
  }).length;
  const requiredChecklistItems = sources.checklists.flatMap((checklist) => checklist.items ?? []);
  const pendingTasks = requiredChecklistItems.filter((item) => item.required && !item.completed).length;
  const trafficInvestment = activeCampaigns.reduce((accumulator, campaign) => accumulator + (campaign.budget ?? 0), 0);

  return {
    generatedAt: now,
    currentUser: {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      status: currentUser.status,
      role: {
        id: currentRole.id ?? currentRole._id,
        code: currentRole.code,
        name: currentRole.name
      },
      permissions: permissionDocs.map((permission) => permission.code)
    },
    shell: {
      sidebar: {
        collapsible: true,
        iconOnlyWhenCollapsed: true,
        mobileDrawer: true,
        items: sidebarItems
      },
      topbar: {
        breadcrumbEnabled: true,
        globalSearchEnabled: true,
        globalSearchShortcuts: dashboardSearchShortcuts,
        notificationsEnabled: true,
        quickCreateEnabled: true,
        profileMenuEnabled: true,
        themeModes: dashboardThemeModes,
        defaultThemeMode: "SYSTEM"
      }
    },
    overview: {
      cards: [
        toCard({
          key: "active-launches",
          title: "Lancamentos ativos",
          value: sources.launches.filter((launch) => classifyLaunchStatus(launch, now) === "ACTIVE").length,
          description: "Lancamentos em execucao no momento",
          moduleKey: "launches",
          route: "/lancamentos"
        }),
        toCard({
          key: "pending-tasks",
          title: "Tarefas pendentes",
          value: pendingTasks,
          description: "Itens obrigatorios ainda nao concluidos nos checklists",
          moduleKey: "operations",
          route: "/operacoes"
        }),
        toCard({
          key: "contents-in-production",
          title: "Conteudos em producao",
          value: contentsInProduction,
          description: "Pecas ainda em andamento ou revisao",
          moduleKey: "contents",
          route: "/conteudos"
        }),
        toCard({
          key: "pending-approvals",
          title: "Aguardando aprovacao",
          value: pendingApprovals,
          description: "Itens ainda na fila de aprovacao",
          moduleKey: "approvals",
          route: "/aprovacoes"
        }),
        toCard({
          key: "active-campaigns",
          title: "Campanhas ativas",
          value: activeCampaigns.length,
          description: "Campanhas planejadas ou em execucao",
          moduleKey: "traffic",
          route: "/trafego"
        }),
        toCard({
          key: "traffic-investment",
          title: "Investimento em trafego",
          value: trafficInvestment,
          description: "Soma do budget das campanhas ativas",
          moduleKey: "traffic",
          route: "/trafego"
        }),
        toCard({
          key: "delayed-activities",
          title: "Atividades atrasadas",
          value: delayedActivities,
          description: "Itens editoriais fora da janela prevista",
          moduleKey: "schedules",
          route: "/cronogramas"
        }),
        toCard({
          key: "upcoming-events",
          title: "Proximos eventos",
          value: upcomingEvents,
          description: "Publicacoes ou eventos previstos para os proximos 7 dias",
          moduleKey: "social-media",
          route: "/social-media"
        }),
        toCard({
          key: "leads-generated",
          title: "Leads gerados",
          value: null,
          description: "Aguardando contrato consolidado de metricas da API",
          moduleKey: "reports",
          route: "/relatorios",
          state: "EMPTY"
        }),
        toCard({
          key: "conversion-rate",
          title: "Taxa de conversao",
          value: null,
          description: "Aguardando contrato consolidado de metricas da API",
          moduleKey: "reports",
          route: "/relatorios",
          state: "EMPTY"
        })
      ],
      charts: buildCharts({
        launches: sources.launches,
        campaigns: sources.campaigns,
        approvals: sources.approvals,
        editorialItems: sources.editorialItems
      }),
      sections: {
        upcomingActivities: buildUpcomingActivities(sources.editorialItems, launchesById, now),
        pendingApprovals: buildApprovalItems(sources.approvals, launchesById),
        activeLaunches: sources.launches
          .map((launch) => ({
            id: launch.id,
            name: launch.name,
            expert: launch.expert,
            product: launch.product,
            periodStart: launch.periodStart,
            periodEnd: launch.periodEnd,
            status: classifyLaunchStatus(launch, now)
          }))
          .slice(0, 6),
        operationalAlerts: buildOperationalAlerts({
          editorialItems: sources.editorialItems,
          campaigns: sources.campaigns,
          launches: sources.launches,
          now
        }),
        recentActivities: buildRecentActivities(sources.auditEvents),
        teamSummary: buildTeamSummary(sources.users, rolesById)
      }
    },
    notifications: {
      total: notifications.length,
      unread: notifications.filter((notification) => !notification.readAt).length
    }
  };
}

async function enrichNotificationsWithReadState(userId, notifications) {
  if (notifications.length === 0) {
    return [];
  }

  const states = await DashboardNotificationState.find({
    userId,
    notificationId: {
      $in: notifications.map((notification) => notification.id)
    }
  });
  const stateByNotificationId = new Map(states.map((state) => [state.notificationId, state]));

  return notifications.map((notification) => {
    const state = stateByNotificationId.get(notification.id);

    return {
      ...notification,
      readAt: state?.readAt ?? null
    };
  });
}

function filterSearchResultsByModules(results, permissionCodes) {
  const allowedModuleKeys = new Set(
    sidebarModuleDefinitions.filter((definition) => hasAnyPermission(permissionCodes, definition.requiredPermissions)).map((definition) => definition.key)
  );

  return results.filter((result) => allowedModuleKeys.has(result.moduleKey));
}

class DashboardService {
  async getStrategistDashboard(filters = {}) {
    const launches = await findLaunches(filters.launchId);
    const now = new Date();
    const items = [];

    for (const launch of launches) {
      const data = await loadLaunchData(launch.id);
      items.push(buildLaunchDashboard(launch, data, now));
    }

    const summary = {
      totalLaunches: items.length,
      averageProgressPercentage: items.length === 0 ? 0 : Math.round(items.reduce((accumulator, item) => accumulator + item.progressPercentage, 0) / items.length),
      pendingCount: items.reduce((accumulator, item) => accumulator + item.pendingCount, 0),
      delayedCount: items.reduce((accumulator, item) => accumulator + item.delayedCount, 0),
      approvedLaunches: items.filter((item) => item.approvalStatus === "APPROVED").length,
      launchesInReview: items.filter((item) => item.approvalStatus === "IN_REVIEW").length
    };

    return {
      generatedAt: now,
      filters: {
        launchId: filters.launchId ?? null
      },
      summary,
      items
    };
  }

  async getOverview({ currentUser, currentRole }) {
    const [permissionDocs, sources] = await Promise.all([listActivePermissions(currentRole), loadDashboardOverviewSources()]);
    const notifications = await this.listNotifications({
      currentUser,
      currentRole,
      permissionDocs,
      sources
    });
    const now = new Date();

    return buildOverviewPayload({
      currentUser,
      currentRole,
      permissionDocs,
      sources,
      notifications,
      now
    });
  }

  async listNotifications({ currentUser, currentRole, permissionDocs = null, sources = null }) {
    const resolvedPermissionDocs = permissionDocs ?? (await listActivePermissions(currentRole));
    const resolvedSources = sources ?? (await loadDashboardOverviewSources());
    const notifications = getNotificationSources({
      approvals: resolvedSources.approvals,
      editorialItems: resolvedSources.editorialItems,
      campaigns: resolvedSources.campaigns,
      launches: resolvedSources.launches,
      currentUser,
      now: new Date()
    });
    const permissionCodes = new Set(resolvedPermissionDocs.map((permission) => permission.code));
    const filteredNotifications = filterSearchResultsByModules(notifications, permissionCodes);

    return enrichNotificationsWithReadState(currentUser.id, filteredNotifications);
  }

  async markNotificationAsRead({ currentUser, currentRole, notificationId }) {
    const notifications = await this.listNotifications({
      currentUser,
      currentRole
    });
    const notification = notifications.find((item) => item.id === notificationId);

    if (!notification) {
      throw {
        statusCode: 404,
        message: "Notification not found"
      };
    }

    const readAt = new Date();

    await DashboardNotificationState.updateOne(
      {
        userId: currentUser.id,
        notificationId
      },
      {
        $set: {
          readAt
        }
      },
      {
        upsert: true
      }
    );

    return {
      ...notification,
      readAt
    };
  }

  async markAllNotificationsAsRead({ currentUser, currentRole }) {
    const notifications = await this.listNotifications({
      currentUser,
      currentRole
    });
    const readAt = new Date();

    if (notifications.length === 0) {
      return {
        readAt,
        notifications: [],
        updatedCount: 0
      };
    }

    await DashboardNotificationState.bulkWrite(
      notifications.map((notification) => ({
        updateOne: {
          filter: {
            userId: currentUser.id,
            notificationId: notification.id
          },
          update: {
            $set: {
              readAt
            }
          },
          upsert: true
        }
      }))
    );

    return {
      readAt,
      updatedCount: notifications.length,
      notifications: notifications.map((notification) => ({
        ...notification,
        readAt
      }))
    };
  }

  async search({ currentRole, query }) {
    const trimmedQuery = query.trim();
    const regex = buildRegex(trimmedQuery);
    const permissionDocs = await listActivePermissions(currentRole);
    const permissionCodes = new Set(permissionDocs.map((permission) => permission.code));
    const now = new Date();

    const [
      launches,
      users,
      campaigns,
      editorialItems,
      reels,
      carousels,
      stories,
      emails,
      youtubeContents
    ] = await Promise.all([
      Launch.find({
        active: true,
        $or: [{ name: regex }, { expert: regex }, { product: regex }]
      }).sort({ updatedAt: -1, createdAt: -1 }),
      User.find({
        status: "ACTIVE",
        $or: [{ name: regex }, { email: regex }]
      }).sort({ updatedAt: -1, createdAt: -1 }),
      TrafficCampaign.find({
        active: true,
        $or: [{ name: regex }, { objective: regex }, { channel: regex }]
      }).sort({ updatedAt: -1, createdAt: -1 }),
      EditorialCalendarItem.find({
        active: true,
        $or: [{ channel: regex }, { responsible: regex }, { contentType: regex }, { notes: regex }]
      }).sort({ publishAt: 1, createdAt: -1 }),
      Reel.find({
        active: true,
        $or: [{ theme: regex }, { objective: regex }, { hook: regex }, { cta: regex }]
      }).sort({ updatedAt: -1, createdAt: -1 }),
      Carousel.find({
        active: true,
        $or: [{ theme: regex }, { objective: regex }, { cta: regex }]
      }).sort({ updatedAt: -1, createdAt: -1 }),
      StorySequence.find({
        active: true,
        $or: [{ theme: regex }, { objective: regex }, { cta: regex }]
      }).sort({ updatedAt: -1, createdAt: -1 }),
      EmailCampaign.find({
        active: true,
        $or: [{ subject: regex }, { objective: regex }, { cta: regex }, { type: regex }]
      }).sort({ updatedAt: -1, createdAt: -1 }),
      YouTubeContent.find({
        active: true,
        $or: [{ theme: regex }, { objective: regex }, { format: regex }, { cta: regex }]
      }).sort({ updatedAt: -1, createdAt: -1 })
    ]);

    const launchResults = launches.map((launch) => ({
      id: launch.id,
      entityType: "LAUNCH",
      moduleKey: "launches",
      title: launch.name,
      subtitle: `${launch.product} - ${launch.expert}`,
      status: classifyLaunchStatus(launch, now),
      route: `/lancamentos/${launch.id}`,
      occurredAt: launch.updatedAt ?? launch.createdAt
    }));

    const strategyResults = launches.map((launch) => ({
      id: `strategy:${launch.id}`,
      entityType: "STRATEGY",
      moduleKey: "strategies",
      title: `Estrategia de ${launch.name}`,
      subtitle: `${launch.product} - ${launch.expert}`,
      status: classifyLaunchStatus(launch, now),
      route: `/estrategias/${launch.id}`,
      occurredAt: launch.updatedAt ?? launch.createdAt
    }));

    const contentResults = [
      ...reels.map((item) => ({
        id: item.id,
        entityType: "CONTENT",
        moduleKey: "contents",
        title: item.theme,
        subtitle: `Reel - ${item.objective}`,
        status: item.operationalStatus,
        route: `/conteudos/${item.id}`,
        occurredAt: item.updatedAt ?? item.createdAt
      })),
      ...carousels.map((item) => ({
        id: item.id,
        entityType: "CONTENT",
        moduleKey: "contents",
        title: item.theme,
        subtitle: `Carrossel - ${item.objective}`,
        status: item.operationalStatus,
        route: `/conteudos/${item.id}`,
        occurredAt: item.updatedAt ?? item.createdAt
      })),
      ...stories.map((item) => ({
        id: item.id,
        entityType: "CONTENT",
        moduleKey: "contents",
        title: item.theme,
        subtitle: `Stories - ${item.objective}`,
        status: item.operationalStatus,
        route: `/conteudos/${item.id}`,
        occurredAt: item.updatedAt ?? item.createdAt
      })),
      ...emails.map((item) => ({
        id: item.id,
        entityType: "CONTENT",
        moduleKey: "contents",
        title: item.subject,
        subtitle: `E-mail - ${item.objective}`,
        status: item.status,
        route: `/conteudos/${item.id}`,
        occurredAt: item.updatedAt ?? item.createdAt
      })),
      ...youtubeContents.map((item) => ({
        id: item.id,
        entityType: "CONTENT",
        moduleKey: "contents",
        title: item.theme,
        subtitle: `YouTube - ${item.objective}`,
        status: item.operationalStatus,
        route: `/conteudos/${item.id}`,
        occurredAt: item.updatedAt ?? item.createdAt
      }))
    ];

    const activityResults = editorialItems.map((item) => ({
      id: item.id,
      entityType: "ACTIVITY",
      moduleKey: "schedules",
      title: `${item.contentType} em ${item.channel}`,
      subtitle: `Responsavel: ${item.responsible}`,
      status: normalizeDate(item.publishAt) < now ? "OVERDUE" : "SCHEDULED",
      route: `/cronogramas/${item.id}`,
      occurredAt: item.publishAt
    }));

    const eventResults = editorialItems.map((item) => ({
      id: `event:${item.id}`,
      entityType: "EVENT",
      moduleKey: "social-media",
      title: `${item.channel} - ${item.contentType}`,
      subtitle: item.notes ?? item.responsible,
      status: normalizeDate(item.publishAt) < now ? "COMPLETED_OR_DELAYED" : "UPCOMING",
      route: `/social-media/${item.id}`,
      occurredAt: item.publishAt
    }));

    const userResults = users.map((user) => ({
      id: user.id,
      entityType: "USER",
      moduleKey: "settings",
      title: user.name,
      subtitle: user.email,
      status: user.status,
      route: `/configuracoes/usuarios/${user.id}`,
      occurredAt: user.updatedAt ?? user.createdAt
    }));

    const campaignResults = campaigns.map((campaign) => ({
      id: campaign.id,
      entityType: "CAMPAIGN",
      moduleKey: "traffic",
      title: campaign.name,
      subtitle: `${campaign.channel} - ${campaign.objective}`,
      status: campaign.status,
      route: `/trafego/campanhas/${campaign.id}`,
      occurredAt: campaign.updatedAt ?? campaign.createdAt
    }));

    const results = filterSearchResultsByModules(
      [
        ...launchResults,
        ...strategyResults,
        ...contentResults,
        ...activityResults,
        ...eventResults,
        ...userResults,
        ...campaignResults
      ],
      permissionCodes
    )
      .sort((left, right) => normalizeDate(right.occurredAt ?? now) - normalizeDate(left.occurredAt ?? now))
      .slice(0, 30)
      .map((item) => toOverviewSearchItem(item));

    return {
      query: trimmedQuery,
      generatedAt: now,
      counts: {
        launches: results.filter((item) => item.entityType === "LAUNCH").length,
        strategies: results.filter((item) => item.entityType === "STRATEGY").length,
        contents: results.filter((item) => item.entityType === "CONTENT").length,
        activities: results.filter((item) => item.entityType === "ACTIVITY").length,
        events: results.filter((item) => item.entityType === "EVENT").length,
        users: results.filter((item) => item.entityType === "USER").length,
        campaigns: results.filter((item) => item.entityType === "CAMPAIGN").length
      },
      items: results
    };
  }
}

export const dashboardService = new DashboardService();
