import { ContentPlan } from "../models/content-plan.model.js";
import { Launch } from "../models/launch.model.js";
import { Carousel } from "../models/carousel.model.js";
import { auditService } from "./audit.service.js";

function normalizeCards(cards = []) {
  return cards.map((card, index) => ({
    order: card.order ?? index + 1,
    message: card.message.trim()
  }));
}

function toPublicCarousel(carousel) {
  return {
    id: carousel.id,
    launchId: carousel.launchId ?? null,
    contentPlanId: carousel.contentPlanId ?? null,
    theme: carousel.theme,
    objective: carousel.objective,
    cta: carousel.cta,
    cardsCount: carousel.cardsCount,
    cards: carousel.cards.map((card) => ({
      id: card.id,
      order: card.order,
      message: card.message
    })),
    operationalStatus: carousel.operationalStatus,
    reviewStatus: carousel.reviewStatus,
    ownerRole: carousel.ownerRole ?? null,
    active: carousel.active,
    deactivatedAt: carousel.deactivatedAt ?? null,
    createdAt: carousel.createdAt,
    updatedAt: carousel.updatedAt,
    createdBy: carousel.createdBy ?? null,
    updatedBy: carousel.updatedBy ?? null
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

async function resolveContext(data) {
  if (!data.theme.trim() || !data.objective.trim()) {
    throw {
      statusCode: 400,
      message: "Carousel requires theme and objective"
    };
  }

  const [launch, contentPlan] = await Promise.all([
    ensureLaunchExists(data.launchId ?? null),
    ensureContentPlanExists(data.contentPlanId ?? null)
  ]);

  const resolvedLaunchId = data.launchId ?? contentPlan?.launchId ?? null;

  if (!resolvedLaunchId && !contentPlan) {
    throw {
      statusCode: 400,
      message: "Carousel requires a launch or content plan context"
    };
  }

  return {
    launchId: resolvedLaunchId,
    contentPlanId: contentPlan?.id ?? data.contentPlanId ?? null
  };
}

class CarouselService {
  async create(authenticatedUserId, data) {
    const context = await resolveContext(data);

    const carousel = await Carousel.create({
      launchId: context.launchId,
      contentPlanId: context.contentPlanId,
      theme: data.theme.trim(),
      objective: data.objective.trim(),
      cta: data.cta.trim(),
      cardsCount: data.cardsCount,
      cards: normalizeCards(data.cards),
      operationalStatus: data.operationalStatus.trim().toUpperCase(),
      reviewStatus: data.reviewStatus?.trim().toUpperCase() ?? "PENDING",
      ownerRole: data.ownerRole?.trim() ?? null,
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "CAROUSEL_CREATED",
      targetType: "CAROUSEL",
      targetId: carousel.id,
      context: {
        launchId: carousel.launchId ?? null,
        contentPlanId: carousel.contentPlanId ?? null,
        cardsCount: carousel.cardsCount,
        operationalStatus: carousel.operationalStatus,
        reviewStatus: carousel.reviewStatus
      }
    });

    return toPublicCarousel(carousel);
  }

  async update(authenticatedUserId, carouselId, data) {
    const carousel = await Carousel.findById(carouselId);

    if (!carousel || !carousel.active) {
      throw {
        statusCode: 404,
        message: "Carousel not found"
      };
    }

    const updates = {
      cards: normalizeCards(data.cards),
      cardsCount: data.cardsCount,
      operationalStatus: data.operationalStatus.trim().toUpperCase(),
      reviewStatus: data.reviewStatus?.trim().toUpperCase() ?? carousel.reviewStatus,
      ownerRole: data.ownerRole?.trim() ?? null,
      updatedBy: authenticatedUserId
    };

    await Carousel.updateOne(
      { _id: carouselId },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "CAROUSEL_UPDATED",
      targetType: "CAROUSEL",
      targetId: carousel.id,
      context: {
        launchId: carousel.launchId ?? null,
        previousOperationalStatus: carousel.operationalStatus,
        operationalStatus: updates.operationalStatus,
        previousReviewStatus: carousel.reviewStatus,
        reviewStatus: updates.reviewStatus,
        cardsCount: updates.cardsCount
      }
    });

    return {
      ...toPublicCarousel(carousel),
      ...updates,
      cards: updates.cards.map((card, index) => ({
        id: carousel.cards[index]?.id ?? undefined,
        order: card.order,
        message: card.message
      }))
    };
  }
}

export const carouselService = new CarouselService();
export { toPublicCarousel };
