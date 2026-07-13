import { AssetLibraryItem } from "../models/asset-library-item.model.js";
import { AuditEvent } from "../models/audit-event.model.js";
import { Avatar } from "../models/avatar.model.js";
import { Carousel } from "../models/carousel.model.js";
import { CompetitorResearch } from "../models/competitor-research.model.js";
import { ContentApproval } from "../models/content-approval.model.js";
import { ContentPlan } from "../models/content-plan.model.js";
import { EditorialLine } from "../models/editorial-line.model.js";
import { EmailCampaign } from "../models/email-campaign.model.js";
import { ExpertApproval } from "../models/expert-approval.model.js";
import { Launch } from "../models/launch.model.js";
import { MarketResearch } from "../models/market-research.model.js";
import { Offer } from "../models/offer.model.js";
import { Positioning } from "../models/positioning.model.js";
import { Reel } from "../models/reel.model.js";
import { SmartSchedule } from "../models/smart-schedule.model.js";
import { StorySequence } from "../models/story-sequence.model.js";
import { Strategy } from "../models/strategy.model.js";
import { TrafficCampaign } from "../models/traffic-campaign.model.js";
import { User } from "../models/user.model.js";
import { YouTubeContent } from "../models/youtube-content.model.js";
import { auditService } from "./audit.service.js";
import { toPublicAvatar } from "./avatar.service.js";
import { groupByChannelAndDate, toPublicCompetitorResearch } from "./competitor-research.service.js";
import { toPublicContentPlan } from "./content-plan.service.js";
import { toPublicEditorialLine } from "./editorial-line.service.js";
import { toPublicExpertApproval } from "./expert-approval.service.js";
import { toPublicOffer } from "./offer.service.js";
import { toPublicPositioning } from "./positioning.service.js";
import { toPublicSmartSchedule } from "./smart-schedule.service.js";

const phaseDefinitions = [
  { key: "warmupStart", label: "Inicio do aquecimento" },
  { key: "cpl1At", label: "CPL 1" },
  { key: "cpl2At", label: "CPL 2" },
  { key: "cpl3At", label: "CPL 3" },
  { key: "cartOpenAt", label: "Abertura de carrinho" },
  { key: "cartCloseAt", label: "Encerramento de carrinho" },
  { key: "deliveryAt", label: "Entrega" }
];

function normalizeDate(value) {
  return new Date(value);
}

function normalizeNullableDate(value) {
  return value ? normalizeDate(value) : null;
}

function normalizePhaseDates(phaseDates = {}) {
  return {
    warmupStart: normalizeNullableDate(phaseDates.warmupStart),
    cpl1At: normalizeNullableDate(phaseDates.cpl1At),
    cpl2At: normalizeNullableDate(phaseDates.cpl2At),
    cpl3At: normalizeNullableDate(phaseDates.cpl3At),
    cartOpenAt: normalizeNullableDate(phaseDates.cartOpenAt),
    cartCloseAt: normalizeNullableDate(phaseDates.cartCloseAt),
    deliveryAt: normalizeNullableDate(phaseDates.deliveryAt)
  };
}

function validatePhaseDates(phaseDates) {
  const orderedValues = phaseDefinitions
    .map((phase) => ({
      key: phase.key,
      label: phase.label,
      date: phaseDates[phase.key]
    }))
    .filter((phase) => phase.date);

  for (let index = 1; index < orderedValues.length; index += 1) {
    const previous = orderedValues[index - 1];
    const current = orderedValues[index];

    if (current.date.getTime() < previous.date.getTime()) {
      throw {
        statusCode: 400,
        message: `Launch phase date ${current.label} must be after ${previous.label}`
      };
    }
  }
}

function buildPeriod(milestones, phaseDates, baseDate) {
  const milestoneDates = milestones.map((milestone) => normalizeDate(milestone.scheduledAt).getTime());
  const phaseDateValues = Object.values(phaseDates)
    .filter(Boolean)
    .map((date) => date.getTime());
  const dates = [...milestoneDates, ...phaseDateValues, normalizeDate(baseDate).getTime()].sort((a, b) => a - b);

  return {
    periodStart: new Date(dates[0]),
    periodEnd: new Date(dates[dates.length - 1])
  };
}

function toPublicLaunch(launch) {
  return {
    id: launch.id,
    name: launch.name,
    expert: launch.expert,
    product: launch.product,
    responsibleUserId: launch.responsibleUserId ?? null,
    status: launch.status,
    baseDate: launch.baseDate,
    periodStart: launch.periodStart,
    periodEnd: launch.periodEnd,
    phaseDates: {
      warmupStart: launch.phaseDates?.warmupStart ?? null,
      cpl1At: launch.phaseDates?.cpl1At ?? null,
      cpl2At: launch.phaseDates?.cpl2At ?? null,
      cpl3At: launch.phaseDates?.cpl3At ?? null,
      cartOpenAt: launch.phaseDates?.cartOpenAt ?? null,
      cartCloseAt: launch.phaseDates?.cartCloseAt ?? null,
      deliveryAt: launch.phaseDates?.deliveryAt ?? null
    },
    goals: {
      leadTarget: launch.goals?.leadTarget ?? null,
      salesTarget: launch.goals?.salesTarget ?? null,
      revenueTarget: launch.goals?.revenueTarget ?? null
    },
    milestones: launch.milestones.map((milestone) => ({
      name: milestone.name,
      scheduledAt: milestone.scheduledAt
    })),
    active: launch.active,
    createdAt: launch.createdAt,
    updatedAt: launch.updatedAt,
    createdBy: launch.createdBy ?? null,
    updatedBy: launch.updatedBy ?? null
  };
}

async function findLaunchOrThrow(launchId) {
  const launch = await Launch.findById(launchId);

  if (!launch) {
    throw {
      statusCode: 404,
      message: "Launch not found"
    };
  }

  return launch;
}

async function toResponsibleSummary(userId) {
  if (!userId) {
    return null;
  }

  const user = await User.findById(userId);

  if (!user) {
    return {
      id: userId,
      name: "Usuario removido"
    };
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}

function calculateExecutionProgress(summary) {
  const stageScores = [
    100,
    summary.strategy.hasCurrentContext ? 100 : 0,
    summary.content.total > 0 ? Math.min(100, summary.content.total * 20) : 0,
    summary.campaigns.total > 0 ? Math.min(100, summary.campaigns.total * 35) : 0,
    summary.approvals.expertApproved ? 100 : summary.approvals.contentApprovedRate
  ];

  return Math.round(stageScores.reduce((sum, value) => sum + value, 0) / stageScores.length);
}

function buildTimeline(launch, smartSchedule, campaigns) {
  const phaseTimeline = phaseDefinitions
    .filter((phase) => launch.phaseDates?.[phase.key])
    .map((phase) => ({
      id: `phase-${phase.key}`,
      type: "PHASE",
      label: phase.label,
      occurredAt: launch.phaseDates[phase.key],
      status: "PLANNED"
    }));

  const milestoneTimeline = launch.milestones.map((milestone, index) => ({
    id: `milestone-${index}`,
    type: "MILESTONE",
    label: milestone.name,
    occurredAt: milestone.scheduledAt,
    status: "PLANNED"
  }));

  const scheduleTimeline = smartSchedule?.activities?.map((activity) => ({
    id: activity.id,
    type: "ACTIVITY",
    label: `${activity.deliveryType} | ${activity.theme}`,
    occurredAt: activity.dueAt,
    status: activity.status
  })) ?? [];

  const campaignTimeline = campaigns.flatMap((campaign) => [
    {
      id: `${campaign.id}-start`,
      type: "CAMPAIGN",
      label: `${campaign.name} | inicio`,
      occurredAt: campaign.periodStart,
      status: campaign.status
    },
    {
      id: `${campaign.id}-end`,
      type: "CAMPAIGN",
      label: `${campaign.name} | fim`,
      occurredAt: campaign.periodEnd,
      status: campaign.status
    }
  ]);

  return [...phaseTimeline, ...milestoneTimeline, ...scheduleTimeline, ...campaignTimeline].sort(
    (left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime()
  );
}

function buildGoalsProgress(goals, approvedContentCount, activeCampaignCount) {
  const leadCurrent = activeCampaignCount * 100;
  const salesCurrent = approvedContentCount * 5;
  const revenueCurrent = salesCurrent * 297;

  return {
    leads: {
      target: goals.leadTarget,
      current: goals.leadTarget ? leadCurrent : null,
      progressPercentage: goals.leadTarget ? Math.min(100, Math.round((leadCurrent / goals.leadTarget) * 100)) : null
    },
    sales: {
      target: goals.salesTarget,
      current: goals.salesTarget ? salesCurrent : null,
      progressPercentage: goals.salesTarget ? Math.min(100, Math.round((salesCurrent / goals.salesTarget) * 100)) : null
    },
    revenue: {
      target: goals.revenueTarget,
      current: goals.revenueTarget ? revenueCurrent : null,
      progressPercentage: goals.revenueTarget ? Math.min(100, Math.round((revenueCurrent / goals.revenueTarget) * 100)) : null
    }
  };
}

function buildLaunchSummary({
  launch,
  strategies,
  currentOffer,
  currentPositioning,
  currentEditorialLine,
  currentContentPlan,
  currentSmartSchedule,
  campaigns,
  contentItems,
  contentApprovals,
  currentApproval,
  assets
}) {
  const approvedContentCount = contentApprovals.filter((approval) => ["APPROVED", "PUBLISHED"].includes(approval.currentStatus)).length;
  const contentApprovedRate = contentApprovals.length ? Math.round((approvedContentCount / contentApprovals.length) * 100) : 0;

  const summary = {
    strategy: {
      total: strategies.length,
      approved: strategies.filter((strategy) => strategy.status === "APPROVED").length,
      hasCurrentContext: Boolean(currentOffer && currentPositioning && currentEditorialLine && currentContentPlan && currentSmartSchedule)
    },
    content: {
      total: contentItems.length,
      byType: contentItems.reduce((accumulator, item) => {
        accumulator[item.type] = (accumulator[item.type] ?? 0) + 1;
        return accumulator;
      }, {})
    },
    campaigns: {
      total: campaigns.length,
      active: campaigns.filter((campaign) => campaign.status === "ACTIVE").length,
      plannedBudget: campaigns.reduce((sum, campaign) => sum + (campaign.budget ?? 0), 0)
    },
    approvals: {
      expertStatus: currentApproval?.status ?? "NOT_SUBMITTED",
      expertApproved: currentApproval?.status === "APPROVED",
      contentPending: contentApprovals.filter((approval) => !["APPROVED", "PUBLISHED"].includes(approval.currentStatus)).length,
      contentApprovedRate
    },
    assets: {
      total: assets.length
    }
  };

  return {
    summary,
    executionProgress: calculateExecutionProgress(summary),
    goalsProgress: buildGoalsProgress(launch.goals ?? {}, approvedContentCount, summary.campaigns.active)
  };
}

class LaunchService {
  async list(filters = {}) {
    const launches = await Launch.find({ active: filters.active ?? true }).sort({ periodStart: 1, createdAt: -1 });

    const items = await Promise.all(
      launches.map(async (launch) => {
        const [responsible, strategies, campaigns, currentApproval] = await Promise.all([
          toResponsibleSummary(launch.responsibleUserId),
          Strategy.find({ launchId: launch.id, active: true }).sort({ updatedAt: -1 }),
          TrafficCampaign.find({ launchId: launch.id, active: true }).sort({ periodStart: 1 }),
          ExpertApproval.findOne({ launchId: launch.id, isCurrent: true }).sort({ version: -1 })
        ]);

        const strategyApproved = strategies.filter((strategy) => strategy.status === "APPROVED").length;
        const progress = strategies.length
          ? Math.round(strategies.reduce((sum, strategy) => sum + (strategy.completionPercentage ?? 0), 0) / strategies.length)
          : 0;

        const item = {
          ...toPublicLaunch(launch),
          responsible,
          progress,
          primaryDates: {
            warmupStart: launch.phaseDates?.warmupStart ?? null,
            cartOpenAt: launch.phaseDates?.cartOpenAt ?? null,
            cartCloseAt: launch.phaseDates?.cartCloseAt ?? null
          },
          strategy: {
            total: strategies.length,
            approved: strategyApproved
          },
          campaigns: {
            total: campaigns.length,
            active: campaigns.filter((campaign) => campaign.status === "ACTIVE").length
          },
          approvals: {
            expertStatus: currentApproval?.status ?? "NOT_SUBMITTED"
          }
        };

        return item;
      })
    );

    const filtered = items.filter((item) => {
      if (filters.status && item.status !== filters.status) {
        return false;
      }

      if (filters.responsibleUserId && item.responsible?.id !== filters.responsibleUserId) {
        return false;
      }

      if (filters.search) {
        const haystack = [item.name, item.product, item.expert, item.responsible?.name ?? ""].join(" ").toLowerCase();
        return haystack.includes(filters.search.toLowerCase());
      }

      return true;
    });

    return {
      summary: {
        total: filtered.length,
        byStatus: filtered.reduce((accumulator, item) => {
          accumulator[item.status] = (accumulator[item.status] ?? 0) + 1;
          return accumulator;
        }, {})
      },
      table: filtered,
      cards: filtered.map((item) => ({
        id: item.id,
        name: item.name,
        status: item.status,
        expert: item.expert,
        product: item.product,
        progress: item.progress,
        responsible: item.responsible,
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
        primaryDates: item.primaryDates
      }))
    };
  }

  async create(authenticatedUserId, data) {
    const normalizedName = data.name.trim();
    const normalizedExpert = data.expert.trim();
    const normalizedProduct = data.product.trim();
    const normalizedBaseDate = normalizeDate(data.baseDate);
    const normalizedPhaseDates = normalizePhaseDates(data.phaseDates);
    validatePhaseDates(normalizedPhaseDates);

    const milestones = data.milestones.map((milestone) => ({
      name: milestone.name.trim(),
      scheduledAt: normalizeDate(milestone.scheduledAt)
    }));
    const { periodStart, periodEnd } = buildPeriod(milestones, normalizedPhaseDates, normalizedBaseDate);

    const existingLaunch = await Launch.findOne({
      name: normalizedName,
      product: normalizedProduct,
      periodStart,
      periodEnd,
      active: true
    });

    if (existingLaunch) {
      throw {
        statusCode: 409,
        message: "An active launch with the same name, product and period already exists"
      };
    }

    const launch = await Launch.create({
      name: normalizedName,
      expert: normalizedExpert,
      product: normalizedProduct,
      responsibleUserId: data.responsibleUserId ?? authenticatedUserId,
      status: data.status ?? "PLANNING",
      baseDate: normalizedBaseDate,
      periodStart,
      periodEnd,
      phaseDates: normalizedPhaseDates,
      goals: {
        leadTarget: data.goals?.leadTarget ?? null,
        salesTarget: data.goals?.salesTarget ?? null,
        revenueTarget: data.goals?.revenueTarget ?? null
      },
      milestones,
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "LAUNCH_CREATED",
      targetType: "LAUNCH",
      targetId: launch.id,
      context: {
        product: launch.product,
        expert: launch.expert,
        baseDate: launch.baseDate.toISOString(),
        status: launch.status,
        responsibleUserId: launch.responsibleUserId
      }
    });

    return toPublicLaunch(launch);
  }

  async getById(launchId) {
    const launch = await findLaunchOrThrow(launchId);

    const [
      marketResearchHistory,
      competitorResearchEntries,
      avatarHistory,
      offerHistory,
      positioningHistory,
      editorialLineHistory,
      contentPlanHistory,
      smartScheduleHistory,
      expertApprovalHistory,
      strategies,
      trafficCampaigns,
      contentApprovals,
      assets,
      launchAuditEvents,
      responsible,
      reels,
      carousels,
      stories,
      emails,
      youtubeContents
    ] = await Promise.all([
      MarketResearch.find({ launchId }).sort({ version: -1, createdAt: -1 }),
      CompetitorResearch.find({ launchId, active: true }).sort({ competitorName: 1, updatedAt: -1 }),
      Avatar.find({ launchId }).sort({ version: -1, createdAt: -1 }),
      Offer.find({ launchId }).sort({ version: -1, createdAt: -1 }),
      Positioning.find({ launchId }).sort({ version: -1, createdAt: -1 }),
      EditorialLine.find({ launchId }).sort({ version: -1, createdAt: -1 }),
      ContentPlan.find({ launchId }).sort({ version: -1, createdAt: -1 }),
      SmartSchedule.find({ launchId }).sort({ version: -1, createdAt: -1 }),
      ExpertApproval.find({ launchId }).sort({ version: -1, createdAt: -1 }),
      Strategy.find({ launchId }).sort({ updatedAt: -1 }),
      TrafficCampaign.find({ launchId, active: true }).sort({ periodStart: 1 }),
      ContentApproval.find({ launchId, active: true }).sort({ updatedAt: -1 }),
      AssetLibraryItem.find({ launchId, active: true }).sort({ updatedAt: -1 }),
      AuditEvent.find({ targetType: "LAUNCH", targetId: launchId }).sort({ occurredAt: -1 }),
      toResponsibleSummary(launch.responsibleUserId),
      Reel.find({ launchId, active: true }).sort({ updatedAt: -1 }),
      Carousel.find({ launchId, active: true }).sort({ updatedAt: -1 }),
      StorySequence.find({ launchId, active: true }).sort({ updatedAt: -1 }),
      EmailCampaign.find({ launchId, active: true }).sort({ updatedAt: -1 }),
      YouTubeContent.find({ launchId, active: true }).sort({ updatedAt: -1 })
    ]);

    const currentOffer = offerHistory.find((offer) => offer.isCurrent) ?? null;
    const currentPositioning = positioningHistory.find((positioning) => positioning.isCurrent) ?? null;
    const currentEditorialLine = editorialLineHistory.find((editorialLine) => editorialLine.isCurrent) ?? null;
    const currentContentPlan = contentPlanHistory.find((contentPlan) => contentPlan.isCurrent) ?? null;
    const currentSmartSchedule = smartScheduleHistory.find((schedule) => schedule.isCurrent) ?? null;
    const currentApproval = expertApprovalHistory.find((approval) => approval.isCurrent) ?? null;

    const contentItems = [
      ...reels.map((item) => ({ id: item.id, type: "REEL", status: item.operationalStatus ?? item.status ?? null })),
      ...carousels.map((item) => ({ id: item.id, type: "CAROUSEL", status: item.operationalStatus ?? item.status ?? null })),
      ...stories.map((item) => ({ id: item.id, type: "STORY_SEQUENCE", status: item.operationalStatus ?? item.status ?? null })),
      ...emails.map((item) => ({ id: item.id, type: "EMAIL_CAMPAIGN", status: item.status ?? null })),
      ...youtubeContents.map((item) => ({ id: item.id, type: "YOUTUBE_CONTENT", status: item.operationalStatus ?? item.status ?? null }))
    ];

    const { summary, executionProgress, goalsProgress } = buildLaunchSummary({
      launch,
      strategies,
      currentOffer,
      currentPositioning,
      currentEditorialLine,
      currentContentPlan,
      currentSmartSchedule,
      campaigns: trafficCampaigns,
      contentItems,
      contentApprovals,
      currentApproval,
      assets
    });

    const timeline = buildTimeline(launch, currentSmartSchedule, trafficCampaigns);

    return {
      ...toPublicLaunch(launch),
      responsible,
      progress: executionProgress,
      marketResearchHistory: marketResearchHistory.map((research) => ({
        id: research.id,
        version: research.version,
        briefing: research.briefing,
        objective: research.objective,
        productContext: research.productContext,
        themes: research.themes.map((theme) => ({
          title: theme.title,
          rationale: theme.rationale
        })),
        promises: research.promises.map((promise) => ({
          title: promise.title,
          rationale: promise.rationale
        })),
        objections: research.objections.map((objection) => ({
          title: objection.title,
          rebuttal: objection.rebuttal
        })),
        ctas: [...research.ctas],
        suggestedFormats: research.suggestedFormats.map((format) => ({
          type: format.type,
          angle: format.angle
        })),
        humanReviewRequired: research.humanReviewRequired,
        createdAt: research.createdAt,
        updatedAt: research.updatedAt,
        createdBy: research.createdBy ?? null,
        updatedBy: research.updatedBy ?? null
      })),
      competitorResearch: {
        items: competitorResearchEntries.map((entry) => toPublicCompetitorResearch(entry)),
        groupedByChannel: groupByChannelAndDate(competitorResearchEntries)
      },
      avatar: {
        current: avatarHistory.find((avatar) => avatar.isCurrent) ? toPublicAvatar(avatarHistory.find((avatar) => avatar.isCurrent)) : null,
        history: avatarHistory.map((avatar) => toPublicAvatar(avatar))
      },
      offer: {
        current: currentOffer ? toPublicOffer(currentOffer) : null,
        history: offerHistory.map((offer) => toPublicOffer(offer))
      },
      positioning: {
        current: currentPositioning ? toPublicPositioning(currentPositioning) : null,
        history: positioningHistory.map((positioning) => toPublicPositioning(positioning))
      },
      editorialLine: {
        current: currentEditorialLine ? toPublicEditorialLine(currentEditorialLine) : null,
        history: editorialLineHistory.map((editorialLine) => toPublicEditorialLine(editorialLine))
      },
      contentPlan: {
        current: currentContentPlan ? toPublicContentPlan(currentContentPlan) : null,
        history: contentPlanHistory.map((contentPlan) => toPublicContentPlan(contentPlan))
      },
      smartSchedule: {
        current: currentSmartSchedule ? toPublicSmartSchedule(currentSmartSchedule) : null,
        history: smartScheduleHistory.map((schedule) => toPublicSmartSchedule(schedule))
      },
      expertApproval: {
        current: currentApproval ? toPublicExpertApproval(currentApproval) : null,
        history: expertApprovalHistory.map((approval) => toPublicExpertApproval(approval))
      },
      tabs: {
        summary: {
          launch: toPublicLaunch(launch),
          responsible,
          goalsProgress
        },
        stages: {
          executionProgress,
          strategy: summary.strategy,
          approvals: summary.approvals
        },
        schedule: {
          phaseDates: launch.phaseDates,
          milestones: toPublicLaunch(launch).milestones,
          timeline
        },
        strategy: {
          total: strategies.length,
          currentStatuses: strategies.map((strategy) => ({
            id: strategy.id,
            title: strategy.title,
            status: strategy.status,
            completionPercentage: strategy.completionPercentage
          })),
          hasCurrentContext: summary.strategy.hasCurrentContext
        },
        contents: {
          total: summary.content.total,
          byType: summary.content.byType,
          approvals: contentApprovals.map((approval) => ({
            id: approval.id,
            contentType: approval.contentType,
            contentId: approval.contentId,
            currentStatus: approval.currentStatus
          }))
        },
        campaigns: {
          total: summary.campaigns.total,
          active: summary.campaigns.active,
          plannedBudget: summary.campaigns.plannedBudget,
          items: trafficCampaigns.map((campaign) => ({
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            channel: campaign.channel,
            periodStart: campaign.periodStart,
            periodEnd: campaign.periodEnd,
            budget: campaign.budget ?? null
          }))
        },
        approvals: {
          expert: currentApproval ? toPublicExpertApproval(currentApproval) : null,
          contentPending: summary.approvals.contentPending,
          contentApprovedRate: summary.approvals.contentApprovedRate
        },
        indicators: {
          executionProgress,
          goalsProgress,
          assetsTotal: summary.assets.total
        },
        files: assets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          type: asset.type,
          status: asset.status,
          origin: asset.origin,
          updatedAt: asset.updatedAt
        })),
        history: launchAuditEvents.map((event) => ({
          id: event.id,
          action: event.action,
          actorUserId: event.actorUserId ?? null,
          context: event.context ?? {},
          occurredAt: event.occurredAt
        }))
      }
    };
  }
}

export const launchService = new LaunchService();
export { toPublicLaunch };
