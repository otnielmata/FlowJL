import { Launch } from "../models/launch.model.js";
import { auditService } from "./audit.service.js";

function normalizeDate(value) {
  return new Date(value);
}

function buildPeriod(milestones) {
  const dates = milestones.map((milestone) => normalizeDate(milestone.scheduledAt).getTime()).sort((a, b) => a - b);
  return {
    periodStart: new Date(dates[0]),
    periodEnd: new Date(dates[dates.length - 1])
  };
}

function toPublicLaunch(launch) {
  return {
    id: launch.id,
    name: launch.name,
    expert: launch.expert,
    product: launch.product,
    baseDate: launch.baseDate,
    periodStart: launch.periodStart,
    periodEnd: launch.periodEnd,
    milestones: launch.milestones.map((milestone) => ({
      name: milestone.name,
      scheduledAt: milestone.scheduledAt
    })),
    active: launch.active,
    createdAt: launch.createdAt,
    updatedAt: launch.updatedAt,
    createdBy: launch.createdBy ?? null,
    updatedBy: launch.updatedBy ?? null
  };
}

class LaunchService {
  async create(authenticatedUserId, data) {
    const normalizedName = data.name.trim();
    const normalizedExpert = data.expert.trim();
    const normalizedProduct = data.product.trim();
    const normalizedBaseDate = normalizeDate(data.baseDate);
    const milestones = data.milestones.map((milestone) => ({
      name: milestone.name.trim(),
      scheduledAt: normalizeDate(milestone.scheduledAt)
    }));
    const { periodStart, periodEnd } = buildPeriod(milestones);

    const existingLaunch = await Launch.findOne({
      name: normalizedName,
      product: normalizedProduct,
      periodStart,
      periodEnd,
      active: true
    });

    if (existingLaunch) {
      throw {
        statusCode: 409,
        message: "An active launch with the same name, product and period already exists"
      };
    }

    const launch = await Launch.create({
      name: normalizedName,
      expert: normalizedExpert,
      product: normalizedProduct,
      baseDate: normalizedBaseDate,
      periodStart,
      periodEnd,
      milestones,
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "LAUNCH_CREATED",
      targetType: "LAUNCH",
      targetId: launch.id,
      context: {
        product: launch.product,
        expert: launch.expert,
        baseDate: launch.baseDate.toISOString()
      }
    });

    return toPublicLaunch(launch);
  }
}

export const launchService = new LaunchService();
export { toPublicLaunch };
