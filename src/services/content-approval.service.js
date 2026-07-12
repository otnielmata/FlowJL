import { randomUUID } from "node:crypto";

import { Carousel } from "../models/carousel.model.js";
import { ContentApproval } from "../models/content-approval.model.js";
import { EmailCampaign } from "../models/email-campaign.model.js";
import { Permission } from "../models/permission.model.js";
import { Reel } from "../models/reel.model.js";
import { Role } from "../models/role.model.js";
import { StorySequence } from "../models/story-sequence.model.js";
import { User } from "../models/user.model.js";
import { YouTubeContent } from "../models/youtube-content.model.js";
import { auditService } from "./audit.service.js";

const approvalFlow = {
  CREATED: ["REVIEW"],
  REVIEW: ["CREATED", "EXPERT"],
  EXPERT: ["REVIEW", "APPROVED"],
  APPROVED: ["PUBLISHED"],
  PUBLISHED: []
};

const contentHandlers = {
  REEL: {
    model: Reel,
    toStatusUpdate(targetStatus) {
      if (targetStatus === "REVIEW" || targetStatus === "EXPERT") {
        return {
          operationalStatus: "IN_REVIEW",
          approvalStatus: "PENDING"
        };
      }

      if (targetStatus === "CREATED") {
        return {
          operationalStatus: "DRAFT",
          approvalStatus: "REJECTED"
        };
      }

      if (targetStatus === "APPROVED") {
        return {
          operationalStatus: "APPROVED",
          approvalStatus: "APPROVED"
        };
      }

      return {
        operationalStatus: "PUBLISHED",
        approvalStatus: "APPROVED"
      };
    }
  },
  CAROUSEL: {
    model: Carousel,
    toStatusUpdate(targetStatus) {
      if (targetStatus === "REVIEW" || targetStatus === "EXPERT") {
        return {
          operationalStatus: "IN_REVIEW",
          reviewStatus: "PENDING"
        };
      }

      if (targetStatus === "CREATED") {
        return {
          operationalStatus: "DRAFT",
          reviewStatus: "REJECTED"
        };
      }

      if (targetStatus === "APPROVED") {
        return {
          operationalStatus: "APPROVED",
          reviewStatus: "APPROVED"
        };
      }

      return {
        operationalStatus: "PUBLISHED",
        reviewStatus: "APPROVED"
      };
    }
  },
  STORY_SEQUENCE: {
    model: StorySequence,
    toStatusUpdate(targetStatus) {
      if (targetStatus === "REVIEW" || targetStatus === "EXPERT") {
        return {
          operationalStatus: "IN_REVIEW"
        };
      }

      if (targetStatus === "CREATED") {
        return {
          operationalStatus: "DRAFT"
        };
      }

      if (targetStatus === "APPROVED") {
        return {
          operationalStatus: "APPROVED"
        };
      }

      return {
        operationalStatus: "PUBLISHED"
      };
    }
  },
  EMAIL_CAMPAIGN: {
    model: EmailCampaign,
    toStatusUpdate(targetStatus) {
      if (targetStatus === "REVIEW" || targetStatus === "EXPERT") {
        return {
          status: "IN_REVIEW",
          reviewStatus: "PENDING"
        };
      }

      if (targetStatus === "CREATED") {
        return {
          status: "DRAFT",
          reviewStatus: "REJECTED"
        };
      }

      if (targetStatus === "APPROVED") {
        return {
          status: "APPROVED",
          reviewStatus: "APPROVED"
        };
      }

      return {
        status: "SENT",
        reviewStatus: "APPROVED"
      };
    }
  },
  YOUTUBE_CONTENT: {
    model: YouTubeContent,
    toStatusUpdate(targetStatus) {
      if (targetStatus === "CREATED") {
        return {
          operationalStatus: "PLANNED"
        };
      }

      if (targetStatus === "PUBLISHED") {
        return {
          operationalStatus: "PUBLISHED"
        };
      }

      return {};
    }
  }
};

function normalizeObservations(value) {
  return value ? value.trim() : null;
}

function isBackwardTransition(fromStatus, toStatus) {
  return (
    (fromStatus === "REVIEW" && toStatus === "CREATED") ||
    (fromStatus === "EXPERT" && toStatus === "REVIEW")
  );
}

function resolvePermissionCode(fromStatus, toStatus) {
  if ((fromStatus === "CREATED" && toStatus === "REVIEW") || (fromStatus === "REVIEW" && toStatus === "CREATED")) {
    return "CONTENT_APPROVAL_REVIEW";
  }

  if ((fromStatus === "REVIEW" && toStatus === "EXPERT") || (fromStatus === "EXPERT" && toStatus === "REVIEW")) {
    return "CONTENT_APPROVAL_EXPERT";
  }

  if (fromStatus === "EXPERT" && toStatus === "APPROVED") {
    return "CONTENT_APPROVAL_APPROVE";
  }

  if (fromStatus === "APPROVED" && toStatus === "PUBLISHED") {
    return "CONTENT_APPROVAL_PUBLISH";
  }

  throw {
    statusCode: 400,
    message: "Invalid approval transition"
  };
}

function toPublicContentApproval(approval) {
  return {
    id: approval.id,
    contentType: approval.contentType,
    contentId: approval.contentId,
    launchId: approval.launchId ?? null,
    currentStatus: approval.currentStatus,
    active: approval.active,
    history: approval.history.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      observations: entry.observations ?? null,
      actorPermission: entry.actorPermission,
      actedBy: entry.actedBy,
      actedAt: entry.actedAt
    })),
    createdAt: approval.createdAt,
    updatedAt: approval.updatedAt,
    createdBy: approval.createdBy ?? null,
    updatedBy: approval.updatedBy ?? null
  };
}

async function ensurePermissionForUser(authenticatedUserId, permissionCode) {
  const user = await User.findById(authenticatedUserId);

  if (!user || user.status !== "ACTIVE") {
    throw {
      statusCode: 401,
      message: "Authenticated user not found"
    };
  }

  const role = await Role.findOne({
    _id: user.roleId,
    active: true
  });

  if (!role) {
    throw {
      statusCode: 403,
      message: "Access denied"
    };
  }

  const permission = await Permission.findOne({
    _id: {
      $in: role.permissionIds
    },
    code: permissionCode,
    active: true
  });

  if (!permission) {
    throw {
      statusCode: 403,
      message: "Access denied"
    };
  }
}

async function resolveContentOrThrow(contentType, contentId) {
  const handler = contentHandlers[contentType];

  if (!handler) {
    throw {
      statusCode: 400,
      message: "Unsupported content type"
    };
  }

  const content = await handler.model.findById(contentId);

  if (!content || content.active === false) {
    throw {
      statusCode: 404,
      message: "Content not found"
    };
  }

  return {
    handler,
    content
  };
}

class ContentApprovalService {
  async changeStatus(authenticatedUserId, contentType, contentId, data) {
    const normalizedContentType = contentType.trim().toUpperCase();
    const targetStatus = data.targetStatus.trim().toUpperCase();
    const observations = normalizeObservations(data.observations);

    const { handler, content } = await resolveContentOrThrow(normalizedContentType, contentId);
    const currentApproval = await ContentApproval.findOne({
      contentType: normalizedContentType,
      contentId
    });
    const currentStatus = currentApproval?.currentStatus ?? "CREATED";

    if (!approvalFlow[currentStatus]?.includes(targetStatus)) {
      throw {
        statusCode: 409,
        message: "Invalid approval order for this content"
      };
    }

    if (isBackwardTransition(currentStatus, targetStatus) && (!observations || observations.length < 3)) {
      throw {
        statusCode: 400,
        message: "Rejection feedback requires observations"
      };
    }

    const permissionCode = resolvePermissionCode(currentStatus, targetStatus);

    await ensurePermissionForUser(authenticatedUserId, permissionCode);

    const contentUpdates = handler.toStatusUpdate(targetStatus);

    await handler.model.updateOne(
      { _id: contentId },
      {
        $set: {
          ...contentUpdates,
          updatedBy: authenticatedUserId
        }
      }
    );

    const historyEntry = {
      id: randomUUID(),
      fromStatus: currentStatus,
      toStatus: targetStatus,
      observations,
      actorPermission: permissionCode,
      actedBy: authenticatedUserId,
      actedAt: new Date()
    };

    if (!currentApproval) {
      const approval = await ContentApproval.create({
        contentType: normalizedContentType,
        contentId,
        launchId: content.launchId ?? null,
        currentStatus: targetStatus,
        history: [historyEntry],
        active: true,
        createdBy: authenticatedUserId,
        updatedBy: authenticatedUserId
      });

      await auditService.record({
        actorUserId: authenticatedUserId,
        action: "CONTENT_APPROVAL_STATUS_CHANGED",
        targetType: "CONTENT_APPROVAL",
        targetId: approval.id,
        context: {
          contentType: normalizedContentType,
          contentId,
          launchId: content.launchId ?? null,
          fromStatus: currentStatus,
          toStatus: targetStatus
        }
      });

      return toPublicContentApproval(approval);
    }

    const nextHistory = [...currentApproval.history, historyEntry];

    await ContentApproval.updateOne(
      { _id: currentApproval.id },
      {
        $set: {
          currentStatus: targetStatus,
          history: nextHistory,
          updatedBy: authenticatedUserId
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "CONTENT_APPROVAL_STATUS_CHANGED",
      targetType: "CONTENT_APPROVAL",
      targetId: currentApproval.id,
      context: {
        contentType: normalizedContentType,
        contentId,
        launchId: content.launchId ?? null,
        fromStatus: currentStatus,
        toStatus: targetStatus
      }
    });

    return {
      ...toPublicContentApproval(currentApproval),
      currentStatus: targetStatus,
      history: nextHistory,
      updatedBy: authenticatedUserId
    };
  }
}

export const contentApprovalService = new ContentApprovalService();
export { toPublicContentApproval };
