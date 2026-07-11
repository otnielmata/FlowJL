import { Avatar } from "../models/avatar.model.js";
import { CompetitorResearch } from "../models/competitor-research.model.js";
import { ContentPlan } from "../models/content-plan.model.js";
import { EditorialLine } from "../models/editorial-line.model.js";
import { ExpertApproval } from "../models/expert-approval.model.js";
import { Launch } from "../models/launch.model.js";
import { MarketResearch } from "../models/market-research.model.js";
import { Offer } from "../models/offer.model.js";
import { Positioning } from "../models/positioning.model.js";
import { SmartSchedule } from "../models/smart-schedule.model.js";
import { auditService } from "./audit.service.js";

function toPublicExpertApproval(approval) {
  return {
    id: approval.id,
    launchId: approval.launchId,
    version: approval.version,
    status: approval.status,
    submittedAt: approval.submittedAt,
    submittedBy: approval.submittedBy,
    decisionAt: approval.decisionAt ?? null,
    decidedBy: approval.decidedBy ?? null,
    observations: approval.observations ?? null,
    marketResearchVersion: approval.marketResearchVersion ?? null,
    competitorResearchCount: approval.competitorResearchCount ?? 0,
    avatarVersion: approval.avatarVersion ?? null,
    offerVersion: approval.offerVersion ?? null,
    positioningVersion: approval.positioningVersion ?? null,
    editorialLineVersion: approval.editorialLineVersion ?? null,
    contentPlanVersion: approval.contentPlanVersion ?? null,
    smartScheduleVersion: approval.smartScheduleVersion ?? null,
    isCurrent: approval.isCurrent,
    active: approval.active,
    createdAt: approval.createdAt,
    updatedAt: approval.updatedAt,
    createdBy: approval.createdBy ?? null,
    updatedBy: approval.updatedBy ?? null
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

async function buildPlanningSnapshotOrThrow(launchId) {
  const [
    marketResearch,
    competitorResearchEntries,
    avatar,
    offer,
    positioning,
    editorialLine,
    contentPlan,
    smartSchedule
  ] = await Promise.all([
    MarketResearch.findOne({ launchId }).sort({ version: -1, createdAt: -1 }),
    CompetitorResearch.find({ launchId, active: true }).sort({ updatedAt: -1 }),
    Avatar.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    Offer.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    Positioning.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    EditorialLine.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    ContentPlan.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    SmartSchedule.findOne({ launchId, isCurrent: true }).sort({ version: -1 })
  ]);

  const missingRequirements = [];

  if (!marketResearch) {
    missingRequirements.push("marketResearch");
  }

  if (competitorResearchEntries.length === 0) {
    missingRequirements.push("competitorResearch");
  }

  if (!avatar) {
    missingRequirements.push("avatar");
  }

  if (!offer) {
    missingRequirements.push("offer");
  }

  if (!positioning) {
    missingRequirements.push("positioning");
  }

  if (!editorialLine) {
    missingRequirements.push("editorialLine");
  }

  if (!contentPlan) {
    missingRequirements.push("contentPlan");
  }

  if (!smartSchedule) {
    missingRequirements.push("smartSchedule");
  }

  if (missingRequirements.length > 0) {
    throw {
      statusCode: 400,
      message: "Expert approval requires a complete planning package",
      details: {
        missingRequirements
      }
    };
  }

  return {
    marketResearchVersion: marketResearch.version,
    competitorResearchCount: competitorResearchEntries.length,
    avatarVersion: avatar.version,
    offerVersion: offer.version,
    positioningVersion: positioning.version,
    editorialLineVersion: editorialLine.version,
    contentPlanVersion: contentPlan.version,
    smartScheduleVersion: smartSchedule.version
  };
}

function normalizeObservations(observations) {
  return observations.trim();
}

class ExpertApprovalService {
  async submit(authenticatedUserId, launchId, data) {
    await findLaunchOrThrow(launchId);

    const planningSnapshot = await buildPlanningSnapshotOrThrow(launchId);
    const currentApproval = await ExpertApproval.findOne({ launchId, isCurrent: true }).sort({ version: -1 });

    if (currentApproval?.status === "IN_REVIEW") {
      throw {
        statusCode: 409,
        message: "Expert approval is already in review"
      };
    }

    if (currentApproval?.status === "APPROVED") {
      throw {
        statusCode: 409,
        message: "Launch planning has already been approved"
      };
    }

    if (currentApproval) {
      await ExpertApproval.updateOne(
        { _id: currentApproval.id },
        {
          $set: {
            isCurrent: false,
            active: false,
            updatedBy: authenticatedUserId
          }
        }
      );
    }

    const submittedAt = new Date();
    const approval = await ExpertApproval.create({
      launchId,
      version: currentApproval ? currentApproval.version + 1 : 1,
      status: "IN_REVIEW",
      submittedAt,
      submittedBy: authenticatedUserId,
      decisionAt: null,
      decidedBy: null,
      observations: data.observations ? normalizeObservations(data.observations) : null,
      ...planningSnapshot,
      isCurrent: true,
      active: true,
      createdBy: currentApproval?.createdBy ?? authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "EXPERT_APPROVAL_SUBMITTED",
      targetType: "EXPERT_APPROVAL",
      targetId: approval.id,
      context: {
        launchId,
        version: approval.version,
        status: approval.status,
        smartScheduleVersion: approval.smartScheduleVersion
      }
    });

    return toPublicExpertApproval(approval);
  }

  async decide(authenticatedUserId, launchId, data) {
    await findLaunchOrThrow(launchId);

    const currentApproval = await ExpertApproval.findOne({ launchId, isCurrent: true }).sort({ version: -1 });

    if (!currentApproval) {
      throw {
        statusCode: 404,
        message: "Expert approval not found"
      };
    }

    if (currentApproval.status !== "IN_REVIEW") {
      throw {
        statusCode: 409,
        message: "Expert approval is not awaiting review"
      };
    }

    await ExpertApproval.updateOne(
      { _id: currentApproval.id },
      {
        $set: {
          isCurrent: false,
          active: false,
          updatedBy: authenticatedUserId
        }
      }
    );

    const status = data.status.trim().toUpperCase();
    const decisionAt = new Date();
    const approval = await ExpertApproval.create({
      launchId,
      version: currentApproval.version + 1,
      status,
      submittedAt: currentApproval.submittedAt,
      submittedBy: currentApproval.submittedBy,
      decisionAt,
      decidedBy: authenticatedUserId,
      observations: normalizeObservations(data.observations),
      marketResearchVersion: currentApproval.marketResearchVersion,
      competitorResearchCount: currentApproval.competitorResearchCount,
      avatarVersion: currentApproval.avatarVersion,
      offerVersion: currentApproval.offerVersion,
      positioningVersion: currentApproval.positioningVersion,
      editorialLineVersion: currentApproval.editorialLineVersion,
      contentPlanVersion: currentApproval.contentPlanVersion,
      smartScheduleVersion: currentApproval.smartScheduleVersion,
      isCurrent: true,
      active: true,
      createdBy: currentApproval.createdBy ?? currentApproval.submittedBy,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: status === "APPROVED" ? "EXPERT_APPROVAL_APPROVED" : "EXPERT_APPROVAL_REJECTED",
      targetType: "EXPERT_APPROVAL",
      targetId: approval.id,
      context: {
        launchId,
        version: approval.version,
        previousVersion: currentApproval.version,
        status: approval.status
      }
    });

    return toPublicExpertApproval(approval);
  }
}

export const expertApprovalService = new ExpertApprovalService();
export { toPublicExpertApproval };
