import { ContentIdea } from "../models/content-idea.model.js";
import { Launch } from "../models/launch.model.js";
import { auditService } from "./audit.service.js";

function toPublicContentIdea(idea) {
  return {
    id: idea.id,
    launchId: idea.launchId ?? null,
    theme: idea.theme,
    objective: idea.objective,
    suggestedFormat: idea.suggestedFormat,
    observations: idea.observations,
    status: idea.status,
    active: idea.active,
    deactivatedAt: idea.deactivatedAt ?? null,
    createdAt: idea.createdAt,
    updatedAt: idea.updatedAt,
    createdBy: idea.createdBy ?? null,
    updatedBy: idea.updatedBy ?? null
  };
}

async function ensureLaunchExists(launchId) {
  if (!launchId) {
    return;
  }

  const launch = await Launch.findById(launchId);

  if (!launch) {
    throw {
      statusCode: 404,
      message: "Launch not found"
    };
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class ContentIdeaService {
  async create(authenticatedUserId, data) {
    const normalizedLaunchId = data.launchId ?? null;
    await ensureLaunchExists(normalizedLaunchId);

    const idea = await ContentIdea.create({
      launchId: normalizedLaunchId,
      theme: data.theme.trim(),
      objective: data.objective.trim(),
      suggestedFormat: data.suggestedFormat.trim(),
      observations: data.observations.trim(),
      status: "BACKLOG",
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "CONTENT_IDEA_CREATED",
      targetType: "CONTENT_IDEA",
      targetId: idea.id,
      context: {
        launchId: idea.launchId,
        objective: idea.objective,
        status: idea.status
      }
    });

    return toPublicContentIdea(idea);
  }

  async list(filters = {}) {
    const query = {};

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.objective) {
      query.objective = {
        $regex: new RegExp(`^${escapeRegex(filters.objective.trim())}$`, "i")
      };
    }

    if (filters.status) {
      query.status = filters.status.trim().toUpperCase();
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    const ideas = await ContentIdea.find(query).sort({ createdAt: -1, theme: 1 });

    return ideas.map((idea) => toPublicContentIdea(idea));
  }

  async deactivate(authenticatedUserId, ideaId) {
    const idea = await ContentIdea.findById(ideaId);

    if (!idea) {
      throw {
        statusCode: 404,
        message: "Content idea not found"
      };
    }

    if (!idea.active) {
      throw {
        statusCode: 409,
        message: "Content idea is already inactive"
      };
    }

    const deactivatedAt = new Date();

    await ContentIdea.updateOne(
      { _id: ideaId },
      {
        $set: {
          status: "DISCARDED",
          active: false,
          deactivatedAt,
          updatedBy: authenticatedUserId
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "CONTENT_IDEA_DEACTIVATED",
      targetType: "CONTENT_IDEA",
      targetId: idea.id,
      context: {
        launchId: idea.launchId ?? null,
        previousStatus: idea.status,
        status: "DISCARDED"
      }
    });

    return {
      ...toPublicContentIdea(idea),
      status: "DISCARDED",
      active: false,
      deactivatedAt,
      updatedBy: authenticatedUserId
    };
  }
}

export const contentIdeaService = new ContentIdeaService();
export { toPublicContentIdea };
