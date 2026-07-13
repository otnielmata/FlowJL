import { Carousel } from "../models/carousel.model.js";
import { ContentApproval } from "../models/content-approval.model.js";
import { EmailCampaign } from "../models/email-campaign.model.js";
import { ExpertApproval } from "../models/expert-approval.model.js";
import { Launch } from "../models/launch.model.js";
import { Reel } from "../models/reel.model.js";
import { StorySequence } from "../models/story-sequence.model.js";
import { User } from "../models/user.model.js";
import { YouTubeContent } from "../models/youtube-content.model.js";
import { contentApprovalService } from "./content-approval.service.js";
import { expertApprovalService } from "./expert-approval.service.js";

const contentHandlers = {
  REEL: {
    model: Reel,
    titleField: "theme",
    statusField: "operationalStatus"
  },
  CAROUSEL: {
    model: Carousel,
    titleField: "theme",
    statusField: "operationalStatus"
  },
  STORY_SEQUENCE: {
    model: StorySequence,
    titleField: "theme",
    statusField: "operationalStatus"
  },
  EMAIL_CAMPAIGN: {
    model: EmailCampaign,
    titleField: "subject",
    statusField: "status"
  },
  YOUTUBE_CONTENT: {
    model: YouTubeContent,
    titleField: "theme",
    statusField: "operationalStatus"
  }
};

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function priorityWeight(priority) {
  return {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  }[priority] ?? 0;
}

function derivePriorityFromDates(referenceDate, now = new Date()) {
  if (!referenceDate) {
    return "MEDIUM";
  }

  const diffInHours = (referenceDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffInHours <= 24) {
    return "CRITICAL";
  }

  if (diffInHours <= 72) {
    return "HIGH";
  }

  return "MEDIUM";
}

async function resolveUserSummary(userId) {
  if (!userId) {
    return {
      userId: null,
      name: null
    };
  }

  const user = await User.findById(userId);

  return {
    userId,
    name: user?.name ?? null
  };
}

async function resolveLaunchSummary(launchId) {
  if (!launchId) {
    return null;
  }

  const launch = await Launch.findById(launchId);

  if (!launch || launch.active === false) {
    return null;
  }

  return {
    id: launch.id,
    name: launch.name,
    expert: launch.expert ?? null,
    product: launch.product ?? null
  };
}

async function resolveContentPreview(contentType, contentId) {
  const handler = contentHandlers[contentType];

  if (!handler) {
    return null;
  }

  const content = await handler.model.findById(contentId);

  if (!content || content.active === false) {
    return null;
  }

  return {
    id: content.id,
    type: contentType,
    title: content[handler.titleField] ?? null,
    status: content[handler.statusField] ?? null,
    createdBy: content.createdBy ?? null,
    updatedBy: content.updatedBy ?? null
  };
}

function buildContentComparison(approval) {
  const currentEntry = approval.history.at(-1) ?? null;
  const previousEntry = approval.history.at(-2) ?? null;

  return {
    current: currentEntry
      ? {
          version: approval.history.length,
          status: currentEntry.toStatus,
          observations: currentEntry.observations ?? null,
          actedAt: currentEntry.actedAt
        }
      : null,
    previous: previousEntry
      ? {
          version: Math.max(approval.history.length - 1, 1),
          status: previousEntry.toStatus,
          observations: previousEntry.observations ?? null,
          actedAt: previousEntry.actedAt
        }
      : null
  };
}

function buildExpertComparison(currentApproval, previousApproval) {
  return {
    current: currentApproval
      ? {
          version: currentApproval.version,
          status: currentApproval.status,
          smartScheduleVersion: currentApproval.smartScheduleVersion ?? null,
          contentPlanVersion: currentApproval.contentPlanVersion ?? null,
          observations: currentApproval.observations ?? null
        }
      : null,
    previous: previousApproval
      ? {
          version: previousApproval.version,
          status: previousApproval.status,
          smartScheduleVersion: previousApproval.smartScheduleVersion ?? null,
          contentPlanVersion: previousApproval.contentPlanVersion ?? null,
          observations: previousApproval.observations ?? null
        }
      : null
  };
}

async function mapContentApprovalItem(approval, authenticatedUserId) {
  const content = await resolveContentPreview(approval.contentType, approval.contentId);
  const requester = await resolveUserSummary(content?.createdBy ?? approval.createdBy ?? null);
  const approver =
    approval.currentStatus === "EXPERT"
      ? {
          userId: null,
          name: "Expert"
        }
      : approval.currentStatus === "APPROVED" || approval.currentStatus === "PUBLISHED"
        ? await resolveUserSummary(approval.updatedBy ?? null)
        : {
            userId: null,
            name: "Estrategista"
          };
  const launch = await resolveLaunchSummary(approval.launchId);
  const comments = approval.history
    .filter((entry) => entry.observations)
    .map((entry) => ({
      id: entry.id,
      message: entry.observations,
      createdAt: entry.actedAt,
      actorPermission: entry.actorPermission,
      actorUserId: entry.actedBy
    }));
  const priority = derivePriorityFromDates(approval.updatedAt);
  const tab =
    approval.currentStatus === "APPROVED" || approval.currentStatus === "PUBLISHED"
      ? "approved"
      : approval.currentStatus === "CREATED" && approval.history.length > 0
        ? "rejected"
        : "pending";

  return {
    approvalType: "CONTENT",
    id: approval.id,
    launch,
    item: {
      id: approval.contentId,
      type: approval.contentType,
      title: content?.title ?? null,
      status: content?.status ?? null
    },
    requester,
    approver,
    dueAt: approval.updatedAt,
    status: approval.currentStatus,
    priority,
    version: approval.history.length > 0 ? approval.history.length : 1,
    requestedByMe: requester.userId === authenticatedUserId,
    commentsCount: comments.length,
    comments,
    history: approval.history.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      observations: entry.observations ?? null,
      actorPermission: entry.actorPermission,
      actedBy: entry.actedBy,
      actedAt: entry.actedAt
    })),
    comparison: buildContentComparison(approval),
    availableActions: {
      canCompareVersions: approval.history.length > 1,
      canViewHistory: approval.history.length > 0,
      decisionOptions:
        approval.currentStatus === "REVIEW"
          ? ["APPROVE", "REQUEST_ADJUST"]
          : approval.currentStatus === "EXPERT"
            ? ["APPROVE", "REQUEST_ADJUST"]
            : approval.currentStatus === "APPROVED"
              ? ["APPROVE"]
              : []
    },
    tab
  };
}

async function mapExpertApprovalItem(approval, authenticatedUserId) {
  const previousApproval = await ExpertApproval.findOne({
    launchId: approval.launchId,
    version: approval.version - 1
  });
  const requester = await resolveUserSummary(approval.submittedBy);
  const approver = approval.decidedBy
    ? await resolveUserSummary(approval.decidedBy)
    : {
        userId: null,
        name: "Expert"
      };
  const launch = await resolveLaunchSummary(approval.launchId);
  const priority = derivePriorityFromDates(approval.decisionAt ?? approval.submittedAt);
  const tab = approval.status === "IN_REVIEW" ? "pending" : approval.status === "APPROVED" ? "approved" : "rejected";

  return {
    approvalType: "EXPERT",
    id: approval.id,
    launch,
    item: {
      id: approval.launchId,
      type: "STRATEGY_PACKAGE",
      title: launch?.name ?? "Pacote estrategico",
      status: approval.status
    },
    requester,
    approver,
    dueAt: approval.decisionAt ?? approval.submittedAt,
    status: approval.status,
    priority,
    version: approval.version,
    requestedByMe: requester.userId === authenticatedUserId,
    commentsCount: approval.observations ? 1 : 0,
    comments: approval.observations
      ? [
          {
            id: approval.id,
            message: approval.observations,
            createdAt: approval.decisionAt ?? approval.submittedAt,
            actorPermission: approval.status === "IN_REVIEW" ? "EXPERT_APPROVAL_SUBMIT" : "EXPERT_APPROVAL_DECIDE",
            actorUserId: approval.decidedBy ?? approval.submittedBy
          }
        ]
      : [],
    history: [
      {
        id: approval.id,
        fromStatus: "IN_REVIEW",
        toStatus: approval.status,
        observations: approval.observations ?? null,
        actorPermission: approval.status === "IN_REVIEW" ? "EXPERT_APPROVAL_SUBMIT" : "EXPERT_APPROVAL_DECIDE",
        actedBy: approval.decidedBy ?? approval.submittedBy,
        actedAt: approval.decisionAt ?? approval.submittedAt
      }
    ],
    comparison: buildExpertComparison(approval, previousApproval),
    availableActions: {
      canCompareVersions: Boolean(previousApproval),
      canViewHistory: true,
      decisionOptions: approval.status === "IN_REVIEW" ? ["APPROVE", "REJECT", "REQUEST_ADJUST"] : []
    },
    tab
  };
}

function sortApprovalItems(items) {
  return items.sort((left, right) => {
    const priorityDiff = priorityWeight(right.priority) - priorityWeight(left.priority);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return normalizeDate(right.dueAt)?.getTime() - normalizeDate(left.dueAt)?.getTime();
  });
}

class ApprovalsManagementService {
  async list(authenticatedUserId) {
    const [contentApprovals, expertApprovals] = await Promise.all([
      ContentApproval.find({ active: true }).sort({ updatedAt: -1 }),
      ExpertApproval.find({ active: true }).sort({ updatedAt: -1 })
    ]);
    const contentItems = [];
    const expertItems = [];

    for (const approval of contentApprovals) {
      contentItems.push(await mapContentApprovalItem(approval, authenticatedUserId));
    }

    for (const approval of expertApprovals) {
      expertItems.push(await mapExpertApprovalItem(approval, authenticatedUserId));
    }

    const allItems = sortApprovalItems([...contentItems, ...expertItems]);
    const tabs = {
      pending: allItems.filter((item) => item.tab === "pending"),
      approved: allItems.filter((item) => item.tab === "approved"),
      rejected: allItems.filter((item) => item.tab === "rejected"),
      requestedByMe: allItems.filter((item) => item.requestedByMe),
      history: allItems
    };

    return {
      tabs,
      summary: {
        pending: tabs.pending.length,
        approved: tabs.approved.length,
        rejected: tabs.rejected.length,
        requestedByMe: tabs.requestedByMe.length,
        history: tabs.history.length
      }
    };
  }

  async getById(authenticatedUserId, approvalType, approvalId) {
    if (approvalType === "CONTENT") {
      const approval = await ContentApproval.findById(approvalId);

      if (!approval || !approval.active) {
        throw {
          statusCode: 404,
          message: "Approval item not found"
        };
      }

      return mapContentApprovalItem(approval, authenticatedUserId);
    }

    const approval = await ExpertApproval.findById(approvalId);

    if (!approval || !approval.active) {
      throw {
        statusCode: 404,
        message: "Approval item not found"
      };
    }

    return mapExpertApprovalItem(approval, authenticatedUserId);
  }

  async decide(authenticatedUserId, approvalType, approvalId, data) {
    if (approvalType === "CONTENT") {
      const approval = await ContentApproval.findById(approvalId);

      if (!approval || !approval.active) {
        throw {
          statusCode: 404,
          message: "Approval item not found"
        };
      }

      let targetStatus = approval.currentStatus;

      if (data.decision === "APPROVE") {
        if (approval.currentStatus === "REVIEW") {
          targetStatus = "EXPERT";
        } else if (approval.currentStatus === "EXPERT") {
          targetStatus = "APPROVED";
        } else if (approval.currentStatus === "APPROVED") {
          targetStatus = "PUBLISHED";
        }
      } else if (data.decision === "REQUEST_ADJUST" || data.decision === "REJECT") {
        targetStatus = approval.currentStatus === "EXPERT" ? "REVIEW" : "CREATED";
      }

      await contentApprovalService.changeStatus(authenticatedUserId, approval.contentType, approval.contentId, {
        targetStatus,
        observations: data.comment
      });

      return this.getById(authenticatedUserId, approvalType, approvalId);
    }

    const approval = await ExpertApproval.findById(approvalId);

    if (!approval || !approval.active) {
      throw {
        statusCode: 404,
        message: "Approval item not found"
      };
    }

    await expertApprovalService.decide(authenticatedUserId, approval.launchId, {
      status: data.decision === "APPROVE" ? "APPROVED" : "REJECTED",
      observations: data.comment ?? "Ajustes solicitados."
    });

    const refreshed = await ExpertApproval.findOne({
      launchId: approval.launchId,
      isCurrent: true
    }).sort({ version: -1 });

    return mapExpertApprovalItem(refreshed, authenticatedUserId);
  }
}

export const approvalsManagementService = new ApprovalsManagementService();
