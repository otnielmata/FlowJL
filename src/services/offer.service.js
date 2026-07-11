import { Avatar } from "../models/avatar.model.js";
import { Launch } from "../models/launch.model.js";
import { Offer } from "../models/offer.model.js";
import { auditService } from "./audit.service.js";

function normalizeList(values) {
  return values.map((value) => value.trim());
}

function toPublicOffer(offer) {
  return {
    id: offer.id,
    launchId: offer.launchId,
    version: offer.version,
    product: offer.product,
    transformation: offer.transformation,
    promise: offer.promise,
    benefits: [...offer.benefits],
    differentials: [...offer.differentials],
    avatarVersion: offer.avatarVersion ?? null,
    positioningContext: offer.positioningContext ?? null,
    isCurrent: offer.isCurrent,
    active: offer.active,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    createdBy: offer.createdBy ?? null,
    updatedBy: offer.updatedBy ?? null
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

async function findCurrentAvatarVersion(launchId) {
  const currentAvatar = await Avatar.findOne({ launchId, isCurrent: true }).sort({ version: -1 });
  return currentAvatar?.version ?? null;
}

class OfferService {
  async create(authenticatedUserId, launchId, data) {
    await findLaunchOrThrow(launchId);

    const existingCurrentOffer = await Offer.findOne({ launchId, isCurrent: true }).sort({ version: -1 });

    if (existingCurrentOffer) {
      throw {
        statusCode: 409,
        message: "A current offer already exists for this launch"
      };
    }

    const avatarVersion = await findCurrentAvatarVersion(launchId);
    const offer = await Offer.create({
      launchId,
      version: 1,
      product: data.product.trim(),
      transformation: data.transformation.trim(),
      promise: data.promise.trim(),
      benefits: normalizeList(data.benefits),
      differentials: normalizeList(data.differentials),
      avatarVersion,
      positioningContext: data.positioningContext?.trim() ?? null,
      isCurrent: true,
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "OFFER_CREATED",
      targetType: "OFFER",
      targetId: offer.id,
      context: {
        launchId,
        version: offer.version,
        avatarVersion
      }
    });

    return toPublicOffer(offer);
  }

  async update(authenticatedUserId, launchId, data) {
    await findLaunchOrThrow(launchId);

    const currentOffer = await Offer.findOne({ launchId, isCurrent: true }).sort({ version: -1 });

    if (!currentOffer) {
      throw {
        statusCode: 404,
        message: "Offer not found"
      };
    }

    await Offer.updateOne(
      { _id: currentOffer.id },
      {
        $set: {
          isCurrent: false,
          active: false,
          updatedBy: authenticatedUserId
        }
      }
    );

    const avatarVersion = await findCurrentAvatarVersion(launchId);
    const offer = await Offer.create({
      launchId,
      version: currentOffer.version + 1,
      product: data.product.trim(),
      transformation: data.transformation.trim(),
      promise: data.promise.trim(),
      benefits: normalizeList(data.benefits),
      differentials: normalizeList(data.differentials),
      avatarVersion,
      positioningContext: data.positioningContext?.trim() ?? null,
      isCurrent: true,
      active: true,
      createdBy: currentOffer.createdBy ?? authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "OFFER_UPDATED",
      targetType: "OFFER",
      targetId: offer.id,
      context: {
        launchId,
        version: offer.version,
        previousVersion: currentOffer.version,
        avatarVersion
      }
    });

    return toPublicOffer(offer);
  }

  async listByLaunch(launchId) {
    const offers = await Offer.find({ launchId }).sort({ version: -1, createdAt: -1 });
    return offers.map((offer) => toPublicOffer(offer));
  }
}

export const offerService = new OfferService();
export { toPublicOffer };
