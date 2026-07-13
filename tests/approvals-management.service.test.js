import { beforeEach, describe, expect, it, vi } from "vitest";

const contentApprovalModel = {
  find: vi.fn(),
  findById: vi.fn()
};

const expertApprovalModel = {
  find: vi.fn(),
  findById: vi.fn(),
  findOne: vi.fn()
};

const reelModel = {
  findById: vi.fn()
};

const carouselModel = {
  findById: vi.fn()
};

const storySequenceModel = {
  findById: vi.fn()
};

const emailCampaignModel = {
  findById: vi.fn()
};

const youtubeContentModel = {
  findById: vi.fn()
};

const userModel = {
  findById: vi.fn()
};

const launchModel = {
  findById: vi.fn()
};

const contentApprovalService = {
  changeStatus: vi.fn()
};

const expertApprovalService = {
  decide: vi.fn()
};

vi.mock("../src/models/content-approval.model.js", () => ({
  ContentApproval: contentApprovalModel
}));

vi.mock("../src/models/expert-approval.model.js", () => ({
  ExpertApproval: expertApprovalModel
}));

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

vi.mock("../src/models/user.model.js", () => ({
  User: userModel
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/services/content-approval.service.js", () => ({
  contentApprovalService
}));

vi.mock("../src/services/expert-approval.service.js", () => ({
  expertApprovalService
}));

const { approvalsManagementService } = await import("../src/services/approvals-management.service.js");

describe("approvalsManagementService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    carouselModel.findById.mockResolvedValue(null);
    storySequenceModel.findById.mockResolvedValue(null);
    emailCampaignModel.findById.mockResolvedValue(null);
    youtubeContentModel.findById.mockResolvedValue(null);
    launchModel.findById.mockResolvedValue({
      id: "launch-1",
      name: "Lancamento A",
      expert: "Expert A",
      product: "Produto A",
      active: true
    });
  });

  it("lists segmented approval tabs", async () => {
    contentApprovalModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "content-approval-1",
          contentType: "REEL",
          contentId: "reel-1",
          launchId: "launch-1",
          currentStatus: "REVIEW",
          history: [],
          createdBy: "user-requester",
          updatedBy: "user-requester",
          updatedAt: new Date("2026-07-13T12:00:00.000Z"),
          active: true
        }
      ])
    });
    expertApprovalModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "expert-approval-1",
          launchId: "launch-1",
          version: 2,
          status: "APPROVED",
          submittedAt: new Date("2026-07-10T12:00:00.000Z"),
          submittedBy: "user-requester",
          decisionAt: new Date("2026-07-11T12:00:00.000Z"),
          decidedBy: "user-approver",
          observations: "Aprovado",
          contentPlanVersion: 2,
          smartScheduleVersion: 2,
          active: true
        }
      ])
    });
    reelModel.findById.mockResolvedValue({
      id: "reel-1",
      theme: "Tema 1",
      operationalStatus: "IN_REVIEW",
      createdBy: "user-requester",
      active: true
    });
    userModel.findById
      .mockResolvedValueOnce({ id: "user-requester", name: "Solicitante" })
      .mockResolvedValueOnce({ id: "user-requester", name: "Solicitante" })
      .mockResolvedValueOnce({ id: "user-approver", name: "Aprovador" });
    expertApprovalModel.findOne.mockResolvedValue(null);

    const result = await approvalsManagementService.list("user-requester");

    expect(result.summary.pending).toBe(1);
    expect(result.summary.approved).toBe(1);
    expect(result.summary.requestedByMe).toBe(2);
    expect(result.tabs.pending[0].item.title).toBe("Tema 1");
  });

  it("returns approval detail with comparison and history", async () => {
    contentApprovalModel.findById.mockResolvedValue({
      id: "content-approval-2",
      contentType: "REEL",
      contentId: "reel-2",
      launchId: "launch-1",
      currentStatus: "EXPERT",
      history: [
        {
          id: "h1",
          fromStatus: "CREATED",
          toStatus: "REVIEW",
          observations: null,
          actorPermission: "CONTENT_APPROVAL_REVIEW",
          actedBy: "user-requester",
          actedAt: new Date("2026-07-10T12:00:00.000Z")
        },
        {
          id: "h2",
          fromStatus: "REVIEW",
          toStatus: "EXPERT",
          observations: "Enviar para expert",
          actorPermission: "CONTENT_APPROVAL_EXPERT",
          actedBy: "user-approver",
          actedAt: new Date("2026-07-11T12:00:00.000Z")
        }
      ],
      createdBy: "user-requester",
      updatedBy: "user-approver",
      updatedAt: new Date("2026-07-11T12:00:00.000Z"),
      active: true
    });
    reelModel.findById.mockResolvedValue({
      id: "reel-2",
      theme: "Tema 2",
      operationalStatus: "IN_REVIEW",
      createdBy: "user-requester",
      active: true
    });
    userModel.findById
      .mockResolvedValueOnce({ id: "user-requester", name: "Solicitante" });

    const result = await approvalsManagementService.getById("user-9", "CONTENT", "content-approval-2");

    expect(result.commentsCount).toBe(1);
    expect(result.availableActions.canCompareVersions).toBe(true);
    expect(result.comparison.previous.status).toBe("REVIEW");
  });

  it("routes decision through the underlying approval services", async () => {
    contentApprovalModel.findById.mockResolvedValue({
      id: "content-approval-3",
      contentType: "REEL",
      contentId: "reel-3",
      launchId: "launch-1",
      currentStatus: "EXPERT",
      history: [],
      createdBy: "user-requester",
      updatedBy: "user-requester",
      updatedAt: new Date("2026-07-13T12:00:00.000Z"),
      active: true
    });
    contentApprovalService.changeStatus.mockResolvedValue({});
    contentApprovalModel.findById.mockResolvedValueOnce({
      id: "content-approval-3",
      contentType: "REEL",
      contentId: "reel-3",
      launchId: "launch-1",
      currentStatus: "EXPERT",
      history: [],
      createdBy: "user-requester",
      updatedBy: "user-requester",
      updatedAt: new Date("2026-07-13T12:00:00.000Z"),
      active: true
    }).mockResolvedValueOnce({
      id: "content-approval-3",
      contentType: "REEL",
      contentId: "reel-3",
      launchId: "launch-1",
      currentStatus: "EXPERT",
      history: [],
      createdBy: "user-requester",
      updatedBy: "user-requester",
      updatedAt: new Date("2026-07-13T12:00:00.000Z"),
      active: true
    });
    reelModel.findById.mockResolvedValue({
      id: "reel-3",
      theme: "Tema 3",
      operationalStatus: "IN_REVIEW",
      createdBy: "user-requester",
      active: true
    });
    userModel.findById.mockResolvedValue({ id: "user-requester", name: "Solicitante" });

    await approvalsManagementService.decide("user-approver", "CONTENT", "content-approval-3", {
      decision: "APPROVE"
    });

    expect(contentApprovalService.changeStatus).toHaveBeenCalledWith("user-approver", "REEL", "reel-3", {
      targetStatus: "APPROVED",
      observations: undefined
    });
  });
});
