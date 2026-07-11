import { Launch } from "../models/launch.model.js";
import { Offer } from "../models/offer.model.js";
import { Positioning } from "../models/positioning.model.js";
import { auditService } from "./audit.service.js";

function normalizeList(values) {
  return values.map((value) => value.trim());
}

function toPublicPositioning(positioning) {
  return {
    id: positioning.id,
    launchId: positioning.launchId,
    version: positioning.version,
    thesis: positioning.thesis,
    centralPromise: positioning.centralPromise,
    differentiators: [...positioning.differentiators],
    references: [...positioning.references],
    offerVersion: positioning.offerVersion ?? null,
    isCurrent: positioning.isCurrent,
    active: positioning.active,
    createdAt: positioning.createdAt,
    updatedAt: positioning.updatedAt,
    createdBy: positioning.createdBy ?? null,
    updatedBy: positioning.updatedBy ?? null
  };
}

async function findLaunchOrThrow(launchId) {
  const launch = await Launch.findById(launchId);

  if (!launch) {
    throw {
      statusCode: 404,
      message: "Launch not found"
    };
  }

  return launch;
}

async function findCurrentOfferVersion(launchId) {
  const currentOffer = await Offer.findOne({ launchId, isCurrent: true }).sort({ version: -1 });
  return currentOffer?.version ?? null;
}

class PositioningService {
  async create(authenticatedUserId, launchId, data) {
    await findLaunchOrThrow(launchId);

    const existingCurrentPositioning = await Positioning.findOne({ launchId, isCurrent: true }).sort({ version: -1 });

    if (existingCurrentPositioning) {
      throw {
        statusCode: 409,
        message: "A current positioning already exists for this launch"
      };
    }

    const offerVersion = await findCurrentOfferVersion(launchId);
    const positioning = await Positioning.create({
      launchId,
      version: 1,
      thesis: data.thesis.trim(),
      centralPromise: data.centralPromise.trim(),
      differentiators: normalizeList(data.differentiators),
      references: normalizeList(data.references),
      offerVersion,
      isCurrent: true,
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "POSITIONING_CREATED",
      targetType: "POSITIONING",
      targetId: positioning.id,
      context: {
        launchId,
        version: positioning.version,
        offerVersion
      }
    });

    return toPublicPositioning(positioning);
  }

  async update(authenticatedUserId, launchId, data) {
    await findLaunchOrThrow(launchId);

    const currentPositioning = await Positioning.findOne({ launchId, isCurrent: true }).sort({ version: -1 });

    if (!currentPositioning) {
      throw {
        statusCode: 404,
        message: "Positioning not found"
      };
    }

    await Positioning.updateOne(
      { _id: currentPositioning.id },
      {
        $set: {
          isCurrent: false,
          active: false,
          updatedBy: authenticatedUserId
        }
      }
    );

    const offerVersion = await findCurrentOfferVersion(launchId);
    const positioning = await Positioning.create({
      launchId,
      version: currentPositioning.version + 1,
      thesis: data.thesis.trim(),
      centralPromise: data.centralPromise.trim(),
      differentiators: normalizeList(data.differentiators),
      references: normalizeList(data.references),
      offerVersion,
      isCurrent: true,
      active: true,
      createdBy: currentPositioning.createdBy ?? authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "POSITIONING_UPDATED",
      targetType: "POSITIONING",
      targetId: positioning.id,
      context: {
        launchId,
        version: positioning.version,
        previousVersion: currentPositioning.version,
        offerVersion
      }
    });

    return toPublicPositioning(positioning);
  }

  async listByLaunch(launchId) {
    const positioningHistory = await Positioning.find({ launchId }).sort({ version: -1, createdAt: -1 });
    return positioningHistory.map((positioning) => toPublicPositioning(positioning));
  }
}

export const positioningService = new PositioningService();
export { toPublicPositioning };
