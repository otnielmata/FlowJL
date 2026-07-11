import { Avatar } from "../models/avatar.model.js";
import { EditorialLine } from "../models/editorial-line.model.js";
import { Launch } from "../models/launch.model.js";
import { Offer } from "../models/offer.model.js";
import { Positioning } from "../models/positioning.model.js";
import { auditService } from "./audit.service.js";

function normalizePillars(pillars) {
  return pillars.map((pillar) => ({
    name: pillar.name.trim(),
    objective: pillar.objective.trim(),
    priority: pillar.priority,
    active: pillar.active ?? true
  }));
}

function toPublicPillar(pillar) {
  return {
    id: pillar.id,
    name: pillar.name,
    objective: pillar.objective,
    priority: pillar.priority,
    active: pillar.active
  };
}

function toPublicEditorialLine(editorialLine) {
  return {
    id: editorialLine.id,
    launchId: editorialLine.launchId,
    version: editorialLine.version,
    pillars: editorialLine.pillars.map((pillar) => toPublicPillar(pillar)),
    avatarVersion: editorialLine.avatarVersion ?? null,
    offerVersion: editorialLine.offerVersion ?? null,
    positioningVersion: editorialLine.positioningVersion ?? null,
    isCurrent: editorialLine.isCurrent,
    active: editorialLine.active,
    createdAt: editorialLine.createdAt,
    updatedAt: editorialLine.updatedAt,
    createdBy: editorialLine.createdBy ?? null,
    updatedBy: editorialLine.updatedBy ?? null
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

async function findStrategicContext(launchId) {
  const [avatar, offer, positioning] = await Promise.all([
    Avatar.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    Offer.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    Positioning.findOne({ launchId, isCurrent: true }).sort({ version: -1 })
  ]);

  return {
    avatarVersion: avatar?.version ?? null,
    offerVersion: offer?.version ?? null,
    positioningVersion: positioning?.version ?? null
  };
}

function ensureStrategicContext(context) {
  if (!context.avatarVersion || !context.offerVersion || !context.positioningVersion) {
    throw {
      statusCode: 400,
      message: "Editorial line requires avatar, offer and positioning context"
    };
  }
}

class EditorialLineService {
  async create(authenticatedUserId, launchId, data) {
    await findLaunchOrThrow(launchId);

    const existingCurrentEditorialLine = await EditorialLine.findOne({ launchId, isCurrent: true }).sort({ version: -1 });

    if (existingCurrentEditorialLine) {
      throw {
        statusCode: 409,
        message: "A current editorial line already exists for this launch"
      };
    }

    const context = await findStrategicContext(launchId);
    ensureStrategicContext(context);

    const editorialLine = await EditorialLine.create({
      launchId,
      version: 1,
      pillars: normalizePillars(data.pillars),
      ...context,
      isCurrent: true,
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "EDITORIAL_LINE_CREATED",
      targetType: "EDITORIAL_LINE",
      targetId: editorialLine.id,
      context: {
        launchId,
        version: editorialLine.version,
        pillars: editorialLine.pillars.length
      }
    });

    return toPublicEditorialLine(editorialLine);
  }

  async update(authenticatedUserId, launchId, data) {
    await findLaunchOrThrow(launchId);

    const currentEditorialLine = await EditorialLine.findOne({ launchId, isCurrent: true }).sort({ version: -1 });

    if (!currentEditorialLine) {
      throw {
        statusCode: 404,
        message: "Editorial line not found"
      };
    }

    const context = await findStrategicContext(launchId);
    ensureStrategicContext(context);

    await EditorialLine.updateOne(
      { _id: currentEditorialLine.id },
      {
        $set: {
          isCurrent: false,
          active: false,
          updatedBy: authenticatedUserId
        }
      }
    );

    const editorialLine = await EditorialLine.create({
      launchId,
      version: currentEditorialLine.version + 1,
      pillars: normalizePillars(data.pillars),
      ...context,
      isCurrent: true,
      active: true,
      createdBy: currentEditorialLine.createdBy ?? authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "EDITORIAL_LINE_UPDATED",
      targetType: "EDITORIAL_LINE",
      targetId: editorialLine.id,
      context: {
        launchId,
        version: editorialLine.version,
        previousVersion: currentEditorialLine.version,
        pillars: editorialLine.pillars.length
      }
    });

    return toPublicEditorialLine(editorialLine);
  }

  async listByLaunch(launchId) {
    const editorialHistory = await EditorialLine.find({ launchId }).sort({ version: -1, createdAt: -1 });
    return editorialHistory.map((editorialLine) => toPublicEditorialLine(editorialLine));
  }
}

export const editorialLineService = new EditorialLineService();
export { toPublicEditorialLine };
