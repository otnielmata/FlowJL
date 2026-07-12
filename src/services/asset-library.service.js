import { AssetLibraryItem } from "../models/asset-library-item.model.js";
import { Launch } from "../models/launch.model.js";
import { auditService } from "./audit.service.js";

function normalizeTags(tags = []) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function toPublicAsset(asset) {
  return {
    id: asset.id,
    launchId: asset.launchId ?? null,
    name: asset.name,
    type: asset.type,
    origin: asset.origin,
    tags: [...asset.tags],
    status: asset.status,
    active: asset.active,
    deactivatedAt: asset.deactivatedAt ?? null,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    createdBy: asset.createdBy ?? null,
    updatedBy: asset.updatedBy ?? null
  };
}

async function ensureLaunchExists(launchId) {
  if (!launchId) {
    return;
  }

  const launch = await Launch.findById(launchId);

  if (!launch) {
    throw {
      statusCode: 404,
      message: "Launch not found"
    };
  }
}

class AssetLibraryService {
  async create(authenticatedUserId, data) {
    const launchId = data.launchId ?? null;
    await ensureLaunchExists(launchId);

    const asset = await AssetLibraryItem.create({
      launchId,
      name: data.name.trim(),
      type: data.type.trim(),
      origin: data.origin.trim(),
      tags: normalizeTags(data.tags),
      status: "AVAILABLE",
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "ASSET_LIBRARY_ITEM_CREATED",
      targetType: "ASSET_LIBRARY_ITEM",
      targetId: asset.id,
      context: {
        launchId: asset.launchId ?? null,
        type: asset.type,
        status: asset.status
      }
    });

    return toPublicAsset(asset);
  }

  async list(filters = {}) {
    const query = {};

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.type) {
      query.type = filters.type.trim();
    }

    if (filters.tag) {
      query.tags = filters.tag.trim();
    }

    if (filters.status) {
      query.status = filters.status.trim().toUpperCase();
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    const assets = await AssetLibraryItem.find(query).sort({ createdAt: -1, name: 1 });
    return assets.map((asset) => toPublicAsset(asset));
  }

  async deactivate(authenticatedUserId, assetId) {
    const asset = await AssetLibraryItem.findById(assetId);

    if (!asset) {
      throw {
        statusCode: 404,
        message: "Asset not found"
      };
    }

    if (!asset.active) {
      throw {
        statusCode: 409,
        message: "Asset is already inactive"
      };
    }

    const deactivatedAt = new Date();

    await AssetLibraryItem.updateOne(
      { _id: assetId },
      {
        $set: {
          status: "ARCHIVED",
          active: false,
          deactivatedAt,
          updatedBy: authenticatedUserId
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "ASSET_LIBRARY_ITEM_DEACTIVATED",
      targetType: "ASSET_LIBRARY_ITEM",
      targetId: asset.id,
      context: {
        launchId: asset.launchId ?? null,
        type: asset.type,
        previousStatus: asset.status,
        status: "ARCHIVED"
      }
    });

    return {
      ...toPublicAsset(asset),
      status: "ARCHIVED",
      active: false,
      deactivatedAt,
      updatedBy: authenticatedUserId
    };
  }
}

export const assetLibraryService = new AssetLibraryService();
export { toPublicAsset };
