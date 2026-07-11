import { ContentIdea } from "../models/content-idea.model.js";
import { ContentPlan } from "../models/content-plan.model.js";
import { Launch } from "../models/launch.model.js";
import { Reel } from "../models/reel.model.js";
import { auditService } from "./audit.service.js";

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function normalizeOptionalString(value) {
  return value ? value.trim() : null;
}

function toPublicReel(reel) {
  return {
    id: reel.id,
    launchId: reel.launchId ?? null,
    contentPlanId: reel.contentPlanId ?? null,
    contentIdeaId: reel.contentIdeaId ?? null,
    sourceType: reel.sourceType,
    theme: reel.theme,
    objective: reel.objective,
    hook: reel.hook,
    cta: reel.cta,
    script: reel.script ?? null,
    caption: reel.caption ?? null,
    operationalStatus: reel.operationalStatus,
    approvalStatus: reel.approvalStatus,
    scheduledAt: reel.scheduledAt ?? null,
    active: reel.active,
    createdAt: reel.createdAt,
    updatedAt: reel.updatedAt,
    createdBy: reel.createdBy ?? null,
    updatedBy: reel.updatedBy ?? null
  };
}

async function ensureLaunchExists(launchId) {
  if (!launchId) {
    return null;
  }

  const launch = await Launch.findById(launchId);

  if (!launch) {
    throw {
      statusCode: 404,
      message: "Launch not found"
    };
  }

  return launch;
}

async function ensureContentPlanExists(contentPlanId) {
  if (!contentPlanId) {
    return null;
  }

  const contentPlan = await ContentPlan.findById(contentPlanId);

  if (!contentPlan) {
    throw {
      statusCode: 404,
      message: "Content plan not found"
    };
  }

  return contentPlan;
}

async function ensureContentIdeaExists(contentIdeaId) {
  if (!contentIdeaId) {
    return null;
  }

  const contentIdea = await ContentIdea.findById(contentIdeaId);

  if (!contentIdea) {
    throw {
      statusCode: 404,
      message: "Content idea not found"
    };
  }

  return contentIdea;
}

async function resolveContext(data) {
  if (!data.theme.trim() || !data.objective.trim()) {
    throw {
      statusCode: 400,
      message: "Reel requires theme and objective"
    };
  }

  const [launch, contentPlan, contentIdea] = await Promise.all([
    ensureLaunchExists(data.launchId ?? null),
    ensureContentPlanExists(data.contentPlanId ?? null),
    ensureContentIdeaExists(data.contentIdeaId ?? null)
  ]);

  const resolvedLaunchId = data.launchId ?? contentPlan?.launchId ?? contentIdea?.launchId ?? null;

  if (!resolvedLaunchId && !contentPlan) {
    throw {
      statusCode: 400,
      message: "Reel requires a launch or content plan context"
    };
  }

  if (data.sourceType === "CONTENT_PLAN" && !contentPlan) {
    throw {
      statusCode: 400,
      message: "Content plan source requires a content plan reference"
    };
  }

  if (data.sourceType === "IDEA" && !contentIdea) {
    throw {
      statusCode: 400,
      message: "Idea source requires a content idea reference"
    };
  }

  return {
    launchId: resolvedLaunchId,
    contentPlanId: contentPlan?.id ?? data.contentPlanId ?? null,
    contentIdeaId: contentIdea?.id ?? data.contentIdeaId ?? null
  };
}

class ReelService {
  async create(authenticatedUserId, data) {
    const context = await resolveContext(data);

    const reel = await Reel.create({
      launchId: context.launchId,
      contentPlanId: context.contentPlanId,
      contentIdeaId: context.contentIdeaId,
      sourceType: data.sourceType.trim().toUpperCase(),
      theme: data.theme.trim(),
      objective: data.objective.trim(),
      hook: data.hook.trim(),
      cta: data.cta.trim(),
      script: normalizeOptionalString(data.script),
      caption: normalizeOptionalString(data.caption),
      operationalStatus: data.operationalStatus.trim().toUpperCase(),
      approvalStatus: data.approvalStatus?.trim().toUpperCase() ?? "PENDING",
      scheduledAt: normalizeDate(data.scheduledAt),
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "REEL_CREATED",
      targetType: "REEL",
      targetId: reel.id,
      context: {
        launchId: reel.launchId ?? null,
        contentPlanId: reel.contentPlanId ?? null,
        contentIdeaId: reel.contentIdeaId ?? null,
        operationalStatus: reel.operationalStatus,
        approvalStatus: reel.approvalStatus
      }
    });

    return toPublicReel(reel);
  }

  async update(authenticatedUserId, reelId, data) {
    const reel = await Reel.findById(reelId);

    if (!reel || !reel.active) {
      throw {
        statusCode: 404,
        message: "Reel not found"
      };
    }

    const updates = {
      script: data.script.trim(),
      caption: normalizeOptionalString(data.caption),
      operationalStatus: data.operationalStatus.trim().toUpperCase(),
      approvalStatus: data.approvalStatus?.trim().toUpperCase() ?? reel.approvalStatus,
      scheduledAt: normalizeDate(data.scheduledAt),
      updatedBy: authenticatedUserId
    };

    await Reel.updateOne(
      { _id: reelId },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "REEL_UPDATED",
      targetType: "REEL",
      targetId: reel.id,
      context: {
        launchId: reel.launchId ?? null,
        previousOperationalStatus: reel.operationalStatus,
        operationalStatus: updates.operationalStatus,
        previousApprovalStatus: reel.approvalStatus,
        approvalStatus: updates.approvalStatus
      }
    });

    return {
      ...toPublicReel(reel),
      ...updates
    };
  }
}

export const reelService = new ReelService();
export { toPublicReel };
