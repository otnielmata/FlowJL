import { beforeEach, describe, expect, it, vi } from "vitest";

const carouselModel = {
  create: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const launchModel = {
  findById: vi.fn()
};

const contentPlanModel = {
  findById: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/carousel.model.js", () => ({
  Carousel: carouselModel
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/content-plan.model.js", () => ({
  ContentPlan: contentPlanModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { carouselService } = await import("../src/services/carousel.service.js");

describe("carouselService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    carouselModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    launchModel.findById.mockResolvedValue(null);
    contentPlanModel.findById.mockResolvedValue(null);
  });

  it("creates a carousel with valid launch context and basic structure", async () => {
    launchModel.findById.mockResolvedValue({
      id: "launch-id"
    });
    carouselModel.create.mockResolvedValue({
      id: "carousel-id",
      launchId: "launch-id",
      contentPlanId: null,
      theme: "Tema educativo",
      objective: "Conversao",
      cta: "Deslize ate o fim",
      cardsCount: 3,
      cards: [
        { id: "card-1", order: 1, message: "Card 1" },
        { id: "card-2", order: 2, message: "Card 2" }
      ],
      operationalStatus: "DRAFT",
      reviewStatus: "PENDING",
      ownerRole: "SOCIAL_MEDIA",
      active: true,
      deactivatedAt: null,
      createdAt: new Date("2026-07-11T12:00:00.000Z"),
      updatedAt: new Date("2026-07-11T12:00:00.000Z"),
      createdBy: "social-id",
      updatedBy: "social-id"
    });

    const result = await carouselService.create("social-id", {
      launchId: "launch-id",
      theme: " Tema educativo ",
      objective: " Conversao ",
      cta: " Deslize ate o fim ",
      cardsCount: 3,
      cards: [
        { message: " Card 1 " },
        { message: " Card 2 " }
      ],
      operationalStatus: "DRAFT",
      ownerRole: "SOCIAL_MEDIA"
    });

    expect(carouselModel.create).toHaveBeenCalledWith({
      launchId: "launch-id",
      contentPlanId: null,
      theme: "Tema educativo",
      objective: "Conversao",
      cta: "Deslize ate o fim",
      cardsCount: 3,
      cards: [
        { order: 1, message: "Card 1" },
        { order: 2, message: "Card 2" }
      ],
      operationalStatus: "DRAFT",
      reviewStatus: "PENDING",
      ownerRole: "SOCIAL_MEDIA",
      active: true,
      deactivatedAt: null,
      createdBy: "social-id",
      updatedBy: "social-id"
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "social-id",
      action: "CAROUSEL_CREATED",
      targetType: "CAROUSEL",
      targetId: "carousel-id",
      context: {
        launchId: "launch-id",
        contentPlanId: null,
        cardsCount: 3,
        operationalStatus: "DRAFT",
        reviewStatus: "PENDING"
      }
    });
    expect(result.id).toBe("carousel-id");
  });

  it("updates carousel messages, status and owner with audit", async () => {
    carouselModel.findById.mockResolvedValue({
      id: "carousel-id",
      launchId: "launch-id",
      contentPlanId: null,
      theme: "Tema educativo",
      objective: "Conversao",
      cta: "Deslize ate o fim",
      cardsCount: 3,
      cards: [
        { id: "card-1", order: 1, message: "Card 1" }
      ],
      operationalStatus: "DRAFT",
      reviewStatus: "PENDING",
      ownerRole: "SOCIAL_MEDIA",
      active: true,
      createdAt: new Date("2026-07-11T12:00:00.000Z"),
      updatedAt: new Date("2026-07-11T12:00:00.000Z"),
      createdBy: "social-id",
      updatedBy: "social-id"
    });

    const result = await carouselService.update("social-id", "carousel-id", {
      cardsCount: 2,
      cards: [
        { order: 1, message: " Slide 1 atualizado " },
        { order: 2, message: " Slide 2 atualizado " }
      ],
      operationalStatus: "IN_REVIEW",
      reviewStatus: "APPROVED",
      ownerRole: "OPERATIONS"
    });

    expect(carouselModel.updateOne).toHaveBeenCalledWith(
      { _id: "carousel-id" },
      {
        $set: {
          cards: [
            { order: 1, message: "Slide 1 atualizado" },
            { order: 2, message: "Slide 2 atualizado" }
          ],
          cardsCount: 2,
          operationalStatus: "IN_REVIEW",
          reviewStatus: "APPROVED",
          ownerRole: "OPERATIONS",
          updatedBy: "social-id"
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "social-id",
      action: "CAROUSEL_UPDATED",
      targetType: "CAROUSEL",
      targetId: "carousel-id",
      context: {
        launchId: "launch-id",
        previousOperationalStatus: "DRAFT",
        operationalStatus: "IN_REVIEW",
        previousReviewStatus: "PENDING",
        reviewStatus: "APPROVED",
        cardsCount: 2
      }
    });
    expect(result.operationalStatus).toBe("IN_REVIEW");
    expect(result.ownerRole).toBe("OPERATIONS");
  });

  it("rejects carousel creation without theme or objective", async () => {
    await expect(
      carouselService.create("social-id", {
        launchId: "launch-id",
        theme: " ",
        objective: "Conversao",
        cta: "Deslize",
        cardsCount: 3,
        cards: [],
        operationalStatus: "DRAFT"
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Carousel requires theme and objective"
    });
  });

  it("rejects carousel creation without launch or content plan context", async () => {
    await expect(
      carouselService.create("social-id", {
        theme: "Tema",
        objective: "Conversao",
        cta: "Deslize",
        cardsCount: 3,
        cards: [],
        operationalStatus: "DRAFT"
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Carousel requires a launch or content plan context"
    });
  });
});
