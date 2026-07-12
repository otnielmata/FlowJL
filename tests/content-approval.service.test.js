import { beforeEach, describe, expect, it, vi } from "vitest";

const reelModel = {
  findById: vi.fn(),
  updateOne: vi.fn()
};

const carouselModel = {
  findById: vi.fn()
};

const storySequenceModel = {
  findById: vi.fn()
};

const emailCampaignModel = {
  findById: vi.fn(),
  updateOne: vi.fn()
};

const youtubeContentModel = {
  findById: vi.fn()
};

const contentApprovalModel = {
  findOne: vi.fn(),
  create: vi.fn(),
  updateOne: vi.fn()
};

const userModel = {
  findById: vi.fn()
};

const roleModel = {
  findOne: vi.fn()
};

const permissionModel = {
  findOne: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

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

vi.mock("../src/models/content-approval.model.js", () => ({
  ContentApproval: contentApprovalModel
}));

vi.mock("../src/models/user.model.js", () => ({
  User: userModel
}));

vi.mock("../src/models/role.model.js", () => ({
  Role: roleModel
}));

vi.mock("../src/models/permission.model.js", () => ({
  Permission: permissionModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { contentApprovalService } = await import("../src/services/content-approval.service.js");

describe("contentApprovalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    reelModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    emailCampaignModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    userModel.findById.mockResolvedValue({
      id: "manager-id",
      status: "ACTIVE",
      roleId: "role-id"
    });
    roleModel.findOne.mockResolvedValue({
      id: "role-id",
      permissionIds: ["perm-id"],
      active: true
    });
    permissionModel.findOne.mockResolvedValue({
      id: "perm-id",
      code: "CONTENT_APPROVAL_REVIEW",
      active: true
    });
    carouselModel.findById.mockResolvedValue(null);
    storySequenceModel.findById.mockResolvedValue(null);
    youtubeContentModel.findById.mockResolvedValue(null);
  });

  it("advances a reel from created to review and records history", async () => {
    reelModel.findById.mockResolvedValue({
      id: "reel-id",
      launchId: "launch-id",
      active: true
    });
    contentApprovalModel.findOne.mockResolvedValue(null);
    contentApprovalModel.create.mockResolvedValue({
      id: "approval-id",
      contentType: "REEL",
      contentId: "reel-id",
      launchId: "launch-id",
      currentStatus: "REVIEW",
      history: [
        {
          id: "history-id",
          fromStatus: "CREATED",
          toStatus: "REVIEW",
          observations: null,
          actorPermission: "CONTENT_APPROVAL_REVIEW",
          actedBy: "manager-id",
          actedAt: new Date("2026-07-12T12:00:00.000Z")
        }
      ],
      active: true,
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      createdBy: "manager-id",
      updatedBy: "manager-id"
    });

    const result = await contentApprovalService.changeStatus("manager-id", "REEL", "reel-id", {
      targetStatus: "REVIEW"
    });

    expect(reelModel.updateOne).toHaveBeenCalledWith(
      { _id: "reel-id" },
      {
        $set: {
          operationalStatus: "IN_REVIEW",
          approvalStatus: "PENDING",
          updatedBy: "manager-id"
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "manager-id",
      action: "CONTENT_APPROVAL_STATUS_CHANGED",
      targetType: "CONTENT_APPROVAL",
      targetId: "approval-id",
      context: {
        contentType: "REEL",
        contentId: "reel-id",
        launchId: "launch-id",
        fromStatus: "CREATED",
        toStatus: "REVIEW"
      }
    });
    expect(result.currentStatus).toBe("REVIEW");
  });

  it("registers rejection feedback when returning a piece from review to created", async () => {
    reelModel.findById.mockResolvedValue({
      id: "reel-id",
      launchId: "launch-id",
      active: true
    });
    contentApprovalModel.findOne.mockResolvedValue({
      id: "approval-id",
      contentType: "REEL",
      contentId: "reel-id",
      launchId: "launch-id",
      currentStatus: "REVIEW",
      history: [],
      active: true,
      createdAt: new Date("2026-07-12T12:00:00.000Z"),
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
      createdBy: "manager-id",
      updatedBy: "manager-id"
    });

    const result = await contentApprovalService.changeStatus("manager-id", "REEL", "reel-id", {
      targetStatus: "CREATED",
      observations: "Ajustar gancho e CTA antes de seguir."
    });

    expect(reelModel.updateOne).toHaveBeenCalledWith(
      { _id: "reel-id" },
      {
        $set: {
          operationalStatus: "DRAFT",
          approvalStatus: "REJECTED",
          updatedBy: "manager-id"
        }
      }
    );
    expect(contentApprovalModel.updateOne).toHaveBeenCalledWith(
      { _id: "approval-id" },
      {
        $set: {
          currentStatus: "CREATED",
          history: expect.arrayContaining([
            expect.objectContaining({
              fromStatus: "REVIEW",
              toStatus: "CREATED",
              observations: "Ajustar gancho e CTA antes de seguir.",
              actorPermission: "CONTENT_APPROVAL_REVIEW"
            })
          ]),
          updatedBy: "manager-id"
        }
      }
    );
    expect(result.currentStatus).toBe("CREATED");
  });

  it("rejects invalid approval order", async () => {
    reelModel.findById.mockResolvedValue({
      id: "reel-id",
      launchId: "launch-id",
      active: true
    });
    contentApprovalModel.findOne.mockResolvedValue(null);

    await expect(
      contentApprovalService.changeStatus("manager-id", "REEL", "reel-id", {
        targetStatus: "APPROVED"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Invalid approval order for this content"
    });
  });

  it("blocks publication before approval", async () => {
    emailCampaignModel.findById.mockResolvedValue({
      id: "email-id",
      launchId: "launch-id",
      active: true
    });
    reelModel.findById.mockResolvedValue(null);
    contentApprovalModel.findOne.mockResolvedValue({
      id: "approval-id",
      contentType: "EMAIL_CAMPAIGN",
      contentId: "email-id",
      launchId: "launch-id",
      currentStatus: "EXPERT",
      history: [],
      active: true
    });

    await expect(
      contentApprovalService.changeStatus("manager-id", "EMAIL_CAMPAIGN", "email-id", {
        targetStatus: "PUBLISHED"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Invalid approval order for this content"
    });
  });

  it("rejects advancement when the user lacks the required permission", async () => {
    reelModel.findById.mockResolvedValue({
      id: "reel-id",
      launchId: "launch-id",
      active: true
    });
    contentApprovalModel.findOne.mockResolvedValue({
      id: "approval-id",
      contentType: "REEL",
      contentId: "reel-id",
      launchId: "launch-id",
      currentStatus: "REVIEW",
      history: [],
      active: true
    });
    permissionModel.findOne.mockResolvedValue(null);

    await expect(
      contentApprovalService.changeStatus("manager-id", "REEL", "reel-id", {
        targetStatus: "EXPERT"
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Access denied"
    });
  });
});
