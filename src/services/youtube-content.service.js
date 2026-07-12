import { EditorialLine } from "../models/editorial-line.model.js";
import { Launch } from "../models/launch.model.js";
import { YouTubeContent } from "../models/youtube-content.model.js";
import { auditService } from "./audit.service.js";

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function normalizeOptionalString(value) {
  return value ? value.trim() : null;
}

function toPublicYouTubeContent(content) {
  return {
    id: content.id,
    launchId: content.launchId,
    editorialLineVersion: content.editorialLineVersion,
    theme: content.theme,
    objective: content.objective,
    format: content.format,
    cta: content.cta,
    script: content.script ?? null,
    ownerRole: content.ownerRole ?? null,
    operationalStatus: content.operationalStatus,
    recordingAt: content.recordingAt ?? null,
    publishAt: content.publishAt ?? null,
    active: content.active,
    deactivatedAt: content.deactivatedAt ?? null,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
    createdBy: content.createdBy ?? null,
    updatedBy: content.updatedBy ?? null
  };
}

async function ensureLaunchExists(launchId) {
  const launch = await Launch.findById(launchId);

  if (!launch) {
    throw {
      statusCode: 404,
      message: "Launch not found"
    };
  }
}

async function findEditorialLineVersionOrThrow(launchId) {
  const editorialLine = await EditorialLine.findOne({ launchId, isCurrent: true }).sort({ version: -1 });

  if (!editorialLine) {
    throw {
      statusCode: 400,
      message: "YouTube content requires an editorial line"
    };
  }

  return editorialLine.version;
}

function ensureEditorialContext(data) {
  if (!data.theme.trim() || !data.objective.trim()) {
    throw {
      statusCode: 400,
      message: "YouTube content requires theme and objective"
    };
  }
}

class YouTubeContentService {
  async create(authenticatedUserId, data) {
    ensureEditorialContext(data);
    await ensureLaunchExists(data.launchId);

    const editorialLineVersion = await findEditorialLineVersionOrThrow(data.launchId);

    const content = await YouTubeContent.create({
      launchId: data.launchId,
      editorialLineVersion,
      theme: data.theme.trim(),
      objective: data.objective.trim(),
      format: data.format.trim(),
      cta: data.cta.trim(),
      script: normalizeOptionalString(data.script),
      ownerRole: normalizeOptionalString(data.ownerRole),
      operationalStatus: data.operationalStatus?.trim().toUpperCase() ?? "PLANNED",
      recordingAt: normalizeDate(data.recordingAt),
      publishAt: normalizeDate(data.publishAt),
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "YOUTUBE_CONTENT_CREATED",
      targetType: "YOUTUBE_CONTENT",
      targetId: content.id,
      context: {
        launchId: content.launchId,
        editorialLineVersion: content.editorialLineVersion,
        format: content.format,
        operationalStatus: content.operationalStatus
      }
    });

    return toPublicYouTubeContent(content);
  }

  async update(authenticatedUserId, contentId, data) {
    const content = await YouTubeContent.findById(contentId);

    if (!content || !content.active) {
      throw {
        statusCode: 404,
        message: "YouTube content not found"
      };
    }

    const updates = {
      script: data.script !== undefined ? data.script.trim() : content.script,
      ownerRole: data.ownerRole !== undefined ? data.ownerRole.trim() : content.ownerRole,
      operationalStatus: data.operationalStatus?.trim().toUpperCase() ?? content.operationalStatus,
      recordingAt: data.recordingAt !== undefined ? normalizeDate(data.recordingAt) : content.recordingAt,
      publishAt: data.publishAt !== undefined ? normalizeDate(data.publishAt) : content.publishAt,
      updatedBy: authenticatedUserId
    };

    await YouTubeContent.updateOne(
      { _id: contentId },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "YOUTUBE_CONTENT_UPDATED",
      targetType: "YOUTUBE_CONTENT",
      targetId: content.id,
      context: {
        launchId: content.launchId,
        editorialLineVersion: content.editorialLineVersion,
        previousOperationalStatus: content.operationalStatus,
        operationalStatus: updates.operationalStatus,
        ownerRole: updates.ownerRole,
        recordingAt: updates.recordingAt,
        publishAt: updates.publishAt
      }
    });

    return {
      ...toPublicYouTubeContent(content),
      ...updates
    };
  }

  async deactivate(authenticatedUserId, contentId) {
    const content = await YouTubeContent.findById(contentId);

    if (!content) {
      throw {
        statusCode: 404,
        message: "YouTube content not found"
      };
    }

    if (!content.active) {
      throw {
        statusCode: 409,
        message: "YouTube content is already inactive"
      };
    }

    const deactivatedAt = new Date();

    await YouTubeContent.updateOne(
      { _id: contentId },
      {
        $set: {
          active: false,
          deactivatedAt,
          updatedBy: authenticatedUserId
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "YOUTUBE_CONTENT_DEACTIVATED",
      targetType: "YOUTUBE_CONTENT",
      targetId: content.id,
      context: {
        launchId: content.launchId,
        editorialLineVersion: content.editorialLineVersion,
        operationalStatus: content.operationalStatus
      }
    });

    return {
      ...toPublicYouTubeContent(content),
      active: false,
      deactivatedAt,
      updatedBy: authenticatedUserId
    };
  }
}

export const youtubeContentService = new YouTubeContentService();
export { toPublicYouTubeContent };
