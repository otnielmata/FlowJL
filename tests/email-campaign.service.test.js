import { beforeEach, describe, expect, it, vi } from "vitest";

const emailCampaignModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const launchModel = {
  findById: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/email-campaign.model.js", () => ({
  EmailCampaign: emailCampaignModel
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { emailCampaignService } = await import("../src/services/email-campaign.service.js");

describe("emailCampaignService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    emailCampaignModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  });

  it("creates an email campaign with type and business objective", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-id"
    });
    emailCampaignModel.create.mockResolvedValue({
      id: "email-id",
      launchId: "launch-id",
      type: "WEBINAR",
      subject: "Assunto principal",
      objective: "Aquecer lista",
      cta: "Clique para confirmar",
      body: null,
      status: "DRAFT",
      reviewStatus: "PENDING",
      plannedSendAt: new Date("2026-07-25T12:00:00.000Z"),
      active: true,
      deactivatedAt: null,
      createdAt: new Date("2026-07-12T10:00:00.000Z"),
      updatedAt: new Date("2026-07-12T10:00:00.000Z"),
      createdBy: "operations-id",
      updatedBy: "operations-id"
    });

    const result = await emailCampaignService.create("operations-id", {
      launchId: "launch-id",
      type: "WEBINAR",
      subject: " Assunto principal ",
      objective: " Aquecer lista ",
      cta: " Clique para confirmar ",
      status: "DRAFT",
      plannedSendAt: "2026-07-25T12:00:00.000Z"
    });

    expect(emailCampaignModel.create).toHaveBeenCalledWith({
      launchId: "launch-id",
      type: "WEBINAR",
      subject: "Assunto principal",
      objective: "Aquecer lista",
      cta: "Clique para confirmar",
      body: null,
      status: "DRAFT",
      reviewStatus: "PENDING",
      plannedSendAt: new Date("2026-07-25T12:00:00.000Z"),
      active: true,
      deactivatedAt: null,
      createdBy: "operations-id",
      updatedBy: "operations-id"
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "operations-id",
      action: "EMAIL_CAMPAIGN_CREATED",
      targetType: "EMAIL_CAMPAIGN",
      targetId: "email-id",
      context: {
        launchId: "launch-id",
        type: "WEBINAR",
        status: "DRAFT",
        reviewStatus: "PENDING"
      }
    });
    expect(result.plannedSendAt).toEqual(new Date("2026-07-25T12:00:00.000Z"));
  });

  it("lists email campaigns filtered by launch, type and status", async () => {
    emailCampaignModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "email-id",
          launchId: "launch-id",
          type: "WEBINAR",
          subject: "Assunto principal",
          objective: "Aquecer lista",
          cta: "Clique para confirmar",
          body: null,
          status: "DRAFT",
          reviewStatus: "PENDING",
          plannedSendAt: null,
          active: true,
          deactivatedAt: null,
          createdAt: new Date("2026-07-12T10:00:00.000Z"),
          updatedAt: new Date("2026-07-12T10:00:00.000Z"),
          createdBy: "operations-id",
          updatedBy: "operations-id"
        }
      ])
    });

    const result = await emailCampaignService.list({
      launchId: "launch-id",
      type: "WEBINAR",
      status: "DRAFT"
    });

    expect(emailCampaignModel.find).toHaveBeenCalledWith({
      launchId: "launch-id",
      type: "WEBINAR",
      status: "DRAFT"
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("email-id");
  });

  it("deactivates an email campaign logically", async () => {
    emailCampaignModel.findById.mockResolvedValue({
      id: "email-id",
      launchId: "launch-id",
      type: "WEBINAR",
      subject: "Assunto principal",
      objective: "Aquecer lista",
      cta: "Clique para confirmar",
      body: null,
      status: "DRAFT",
      reviewStatus: "PENDING",
      plannedSendAt: null,
      active: true,
      deactivatedAt: null,
      createdAt: new Date("2026-07-12T10:00:00.000Z"),
      updatedAt: new Date("2026-07-12T10:00:00.000Z"),
      createdBy: "operations-id",
      updatedBy: "operations-id"
    });

    const result = await emailCampaignService.deactivate("operations-id", "email-id");

    expect(emailCampaignModel.updateOne).toHaveBeenCalledWith(
      { _id: "email-id" },
      {
        $set: {
          active: false,
          deactivatedAt: expect.any(Date),
          updatedBy: "operations-id"
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "operations-id",
      action: "EMAIL_CAMPAIGN_DEACTIVATED",
      targetType: "EMAIL_CAMPAIGN",
      targetId: "email-id",
      context: {
        launchId: "launch-id",
        type: "WEBINAR",
        status: "DRAFT"
      }
    });
    expect(result.active).toBe(false);
  });

  it("rejects email creation without a valid launch", async () => {
    launchModel.findById.mockResolvedValue(null);

    await expect(
      emailCampaignService.create("operations-id", {
        launchId: "launch-id",
        type: "WEBINAR",
        subject: "Assunto principal",
        objective: "Aquecer lista",
        cta: "Clique para confirmar",
        status: "DRAFT"
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Launch not found"
    });
  });
});
