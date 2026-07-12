import mongoose from "mongoose";

import "../models/asset-library-item.model.js";
import "../models/audit-event.model.js";
import "../models/auth-session.model.js";
import "../models/avatar.model.js";
import "../models/carousel.model.js";
import "../models/competitor-research.model.js";
import "../models/content-approval.model.js";
import "../models/content-idea.model.js";
import "../models/content-plan.model.js";
import "../models/content-status-history.model.js";
import "../models/copywriting.model.js";
import "../models/editorial-line.model.js";
import "../models/email-campaign.model.js";
import "../models/expert-approval.model.js";
import "../models/external-integration.model.js";
import "../models/external-publication-link.model.js";
import "../models/launch.model.js";
import "../models/market-research.model.js";
import "../models/offer.model.js";
import "../models/permission.model.js";
import "../models/positioning.model.js";
import "../models/profile.model.js";
import "../models/production-checklist.model.js";
import "../models/publication.model.js";
import "../models/reel.model.js";
import "../models/role.model.js";
import "../models/smart-schedule.model.js";
import "../models/story-sequence.model.js";
import "../models/traffic-campaign.model.js";
import "../models/traffic-creative.model.js";
import "../models/traffic-pixel.model.js";
import "../models/user.model.js";
import "../models/youtube-content.model.js";
import { accessSeedService } from "./access-seed.service.js";

function isCollectionAlreadyExistsError(error) {
  return error?.code === 48 || error?.codeName === "NamespaceExists";
}

class DatabaseSyncService {
  async sync({ models = Object.values(mongoose.models) } = {}) {
    const syncedModels = [];

    for (const model of models) {
      try {
        await model.createCollection();
      } catch (error) {
        if (!isCollectionAlreadyExistsError(error)) {
          throw error;
        }
      }

      await model.createIndexes();
      syncedModels.push(model.modelName);
    }

    await accessSeedService.ensureCoreAccessSeed();

    return {
      syncedModels,
      syncedModelsCount: syncedModels.length,
      accessSeedApplied: true
    };
  }
}

export const databaseSyncService = new DatabaseSyncService();
export { DatabaseSyncService };
