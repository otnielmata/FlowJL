import { Avatar } from "../models/avatar.model.js";
import { CompetitorResearch } from "../models/competitor-research.model.js";
import { ContentPlan } from "../models/content-plan.model.js";
import { EditorialLine } from "../models/editorial-line.model.js";
import { Launch } from "../models/launch.model.js";
import { MarketResearch } from "../models/market-research.model.js";
import { Offer } from "../models/offer.model.js";
import { Positioning } from "../models/positioning.model.js";
import { SmartSchedule } from "../models/smart-schedule.model.js";
import { auditService } from "./audit.service.js";
import { toPublicAvatar } from "./avatar.service.js";
import { groupByChannelAndDate, toPublicCompetitorResearch } from "./competitor-research.service.js";
import { toPublicContentPlan } from "./content-plan.service.js";
import { toPublicEditorialLine } from "./editorial-line.service.js";
import { toPublicOffer } from "./offer.service.js";
import { toPublicPositioning } from "./positioning.service.js";
import { toPublicSmartSchedule } from "./smart-schedule.service.js";

function normalizeDate(value) {
  return new Date(value);
}

function buildPeriod(milestones) {
  const dates = milestones.map((milestone) => normalizeDate(milestone.scheduledAt).getTime()).sort((a, b) => a - b);
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
    baseDate: launch.baseDate,
    periodStart: launch.periodStart,
    periodEnd: launch.periodEnd,
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

class LaunchService {
  async create(authenticatedUserId, data) {
    const normalizedName = data.name.trim();
    const normalizedExpert = data.expert.trim();
    const normalizedProduct = data.product.trim();
    const normalizedBaseDate = normalizeDate(data.baseDate);
    const milestones = data.milestones.map((milestone) => ({
      name: milestone.name.trim(),
      scheduledAt: normalizeDate(milestone.scheduledAt)
    }));
    const { periodStart, periodEnd } = buildPeriod(milestones);

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
      baseDate: normalizedBaseDate,
      periodStart,
      periodEnd,
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
        baseDate: launch.baseDate.toISOString()
      }
    });

    return toPublicLaunch(launch);
  }

  async getById(launchId) {
    const launch = await Launch.findById(launchId);

    if (!launch) {
      throw {
        statusCode: 404,
        message: "Launch not found"
      };
    }

    const marketResearchHistory = await MarketResearch.find({ launchId }).sort({ version: -1, createdAt: -1 });
    const competitorResearchEntries = await CompetitorResearch.find({ launchId, active: true }).sort({ competitorName: 1, updatedAt: -1 });
    const avatarHistory = await Avatar.find({ launchId }).sort({ version: -1, createdAt: -1 });
    const offerHistory = await Offer.find({ launchId }).sort({ version: -1, createdAt: -1 });
    const positioningHistory = await Positioning.find({ launchId }).sort({ version: -1, createdAt: -1 });
    const editorialLineHistory = await EditorialLine.find({ launchId }).sort({ version: -1, createdAt: -1 });
    const contentPlanHistory = await ContentPlan.find({ launchId }).sort({ version: -1, createdAt: -1 });
    const smartScheduleHistory = await SmartSchedule.find({ launchId }).sort({ version: -1, createdAt: -1 });

    return {
      ...toPublicLaunch(launch),
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
        current: offerHistory.find((offer) => offer.isCurrent) ? toPublicOffer(offerHistory.find((offer) => offer.isCurrent)) : null,
        history: offerHistory.map((offer) => toPublicOffer(offer))
      },
      positioning: {
        current: positioningHistory.find((positioning) => positioning.isCurrent) ? toPublicPositioning(positioningHistory.find((positioning) => positioning.isCurrent)) : null,
        history: positioningHistory.map((positioning) => toPublicPositioning(positioning))
      },
      editorialLine: {
        current: editorialLineHistory.find((editorialLine) => editorialLine.isCurrent) ? toPublicEditorialLine(editorialLineHistory.find((editorialLine) => editorialLine.isCurrent)) : null,
        history: editorialLineHistory.map((editorialLine) => toPublicEditorialLine(editorialLine))
      },
      contentPlan: {
        current: contentPlanHistory.find((contentPlan) => contentPlan.isCurrent) ? toPublicContentPlan(contentPlanHistory.find((contentPlan) => contentPlan.isCurrent)) : null,
        history: contentPlanHistory.map((contentPlan) => toPublicContentPlan(contentPlan))
      },
      smartSchedule: {
        current: smartScheduleHistory.find((schedule) => schedule.isCurrent) ? toPublicSmartSchedule(smartScheduleHistory.find((schedule) => schedule.isCurrent)) : null,
        history: smartScheduleHistory.map((schedule) => toPublicSmartSchedule(schedule))
      }
    };
  }
}

export const launchService = new LaunchService();
export { toPublicLaunch };
