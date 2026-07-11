import { Avatar } from "../models/avatar.model.js";
import { CompetitorResearch } from "../models/competitor-research.model.js";
import { Launch } from "../models/launch.model.js";
import { MarketResearch } from "../models/market-research.model.js";
import { auditService } from "./audit.service.js";
import { avatarGeneratorService } from "./avatar-generator.service.js";

function normalizeList(values) {
  return values.map((value) => value.trim());
}

function mapSuggestionList(items) {
  return items.map((item) => ({
    title: item.title,
    rationale: item.rationale
  }));
}

function toPublicAvatar(avatar) {
  return {
    id: avatar.id,
    launchId: avatar.launchId,
    version: avatar.version,
    profile: avatar.profile,
    pains: [...avatar.pains],
    dreams: [...avatar.dreams],
    objections: [...avatar.objections],
    language: [...avatar.language],
    isPrimary: avatar.isPrimary,
    isCurrent: avatar.isCurrent,
    humanReviewRequired: avatar.humanReviewRequired,
    aiSuggestions: {
      profileAngles: mapSuggestionList(avatar.aiSuggestions?.profileAngles ?? []),
      painAmplifiers: mapSuggestionList(avatar.aiSuggestions?.painAmplifiers ?? []),
      dreamDrivers: mapSuggestionList(avatar.aiSuggestions?.dreamDrivers ?? []),
      languageCues: mapSuggestionList(avatar.aiSuggestions?.languageCues ?? [])
    },
    createdAt: avatar.createdAt,
    updatedAt: avatar.updatedAt,
    createdBy: avatar.createdBy ?? null,
    updatedBy: avatar.updatedBy ?? null
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

class AvatarService {
  async create(authenticatedUserId, launchId, data) {
    await findLaunchOrThrow(launchId);

    const existingCurrentAvatar = await Avatar.findOne({ launchId, isCurrent: true }).sort({ version: -1 });

    if (existingCurrentAvatar) {
      throw {
        statusCode: 409,
        message: "A current avatar already exists for this launch"
      };
    }

    const avatar = await Avatar.create({
      launchId,
      version: 1,
      profile: data.profile.trim(),
      pains: normalizeList(data.pains),
      dreams: normalizeList(data.dreams),
      objections: normalizeList(data.objections),
      language: normalizeList(data.language),
      isPrimary: true,
      isCurrent: true,
      humanReviewRequired: true,
      aiSuggestions: {
        profileAngles: [],
        painAmplifiers: [],
        dreamDrivers: [],
        languageCues: []
      },
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AVATAR_CREATED",
      targetType: "AVATAR",
      targetId: avatar.id,
      context: {
        launchId,
        version: avatar.version
      }
    });

    return toPublicAvatar(avatar);
  }

  async update(authenticatedUserId, launchId, data) {
    await findLaunchOrThrow(launchId);

    const currentAvatar = await Avatar.findOne({ launchId, isCurrent: true }).sort({ version: -1 });

    if (!currentAvatar) {
      throw {
        statusCode: 404,
        message: "Avatar not found"
      };
    }

    await Avatar.updateOne(
      { _id: currentAvatar.id },
      {
        $set: {
          isCurrent: false,
          updatedBy: authenticatedUserId
        }
      }
    );

    const avatar = await Avatar.create({
      launchId,
      version: currentAvatar.version + 1,
      profile: data.profile.trim(),
      pains: normalizeList(data.pains),
      dreams: normalizeList(data.dreams),
      objections: normalizeList(data.objections),
      language: normalizeList(data.language),
      isPrimary: currentAvatar.isPrimary,
      isCurrent: true,
      humanReviewRequired: true,
      aiSuggestions: currentAvatar.aiSuggestions ?? {
        profileAngles: [],
        painAmplifiers: [],
        dreamDrivers: [],
        languageCues: []
      },
      createdBy: currentAvatar.createdBy ?? authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AVATAR_UPDATED",
      targetType: "AVATAR",
      targetId: avatar.id,
      context: {
        launchId,
        version: avatar.version,
        previousVersion: currentAvatar.version
      }
    });

    return toPublicAvatar(avatar);
  }

  async suggest(launchId) {
    const launch = await findLaunchOrThrow(launchId);
    const currentAvatar = await Avatar.findOne({ launchId, isCurrent: true }).sort({ version: -1 });
    const marketResearchHistory = await MarketResearch.find({ launchId }).sort({ version: -1, createdAt: -1 });
    const competitorResearch = await CompetitorResearch.find({ launchId, active: true }).sort({ competitorName: 1, updatedAt: -1 });

    const suggestions = avatarGeneratorService.generate({
      launch,
      currentAvatar,
      marketResearchHistory,
      competitorResearch: {
        items: competitorResearch
      }
    });

    return {
      launchId,
      basedOnAvatarVersion: currentAvatar?.version ?? null,
      profileAngles: mapSuggestionList(suggestions.profileAngles),
      painAmplifiers: mapSuggestionList(suggestions.painAmplifiers),
      dreamDrivers: mapSuggestionList(suggestions.dreamDrivers),
      languageCues: mapSuggestionList(suggestions.languageCues),
      humanReviewRequired: true
    };
  }

  async listByLaunch(launchId) {
    const avatars = await Avatar.find({ launchId }).sort({ version: -1, createdAt: -1 });
    return avatars.map((avatar) => toPublicAvatar(avatar));
  }
}

export const avatarService = new AvatarService();
export { toPublicAvatar };
