import { ContentPlan } from "../models/content-plan.model.js";
import { EditorialLine } from "../models/editorial-line.model.js";
import { Launch } from "../models/launch.model.js";
import { auditService } from "./audit.service.js";

function normalizeItems(items) {
  return items.map((item) => ({
    theme: item.theme.trim(),
    format: item.format.trim(),
    objective: item.objective.trim(),
    cta: item.cta.trim(),
    stage: item.stage.trim(),
    periodLabel: item.periodLabel.trim(),
    active: item.active ?? true
  }));
}

function toPublicItem(item) {
  return {
    id: item.id,
    theme: item.theme,
    format: item.format,
    objective: item.objective,
    cta: item.cta,
    stage: item.stage,
    periodLabel: item.periodLabel,
    active: item.active
  };
}

function groupItems(items) {
  const byStage = new Map();
  const byPeriod = new Map();
  const byObjective = new Map();

  for (const item of items) {
    if (!byStage.has(item.stage)) {
      byStage.set(item.stage, []);
    }
    byStage.get(item.stage).push(item);

    if (!byPeriod.has(item.periodLabel)) {
      byPeriod.set(item.periodLabel, []);
    }
    byPeriod.get(item.periodLabel).push(item);

    if (!byObjective.has(item.objective)) {
      byObjective.set(item.objective, []);
    }
    byObjective.get(item.objective).push(item);
  }

  const mapGroup = (entries, keyName) =>
    [...entries.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, groupedItems]) => ({
      [keyName]: key,
      items: groupedItems.map((item) => toPublicItem(item))
    }));

  return {
    byStage: mapGroup(byStage, "stage"),
    byPeriod: mapGroup(byPeriod, "periodLabel"),
    byObjective: mapGroup(byObjective, "objective")
  };
}

function toPublicContentPlan(contentPlan) {
  const items = contentPlan.items.map((item) => toPublicItem(item));

  return {
    id: contentPlan.id,
    launchId: contentPlan.launchId,
    version: contentPlan.version,
    items,
    editorialLineVersion: contentPlan.editorialLineVersion ?? null,
    grouped: groupItems(contentPlan.items),
    isCurrent: contentPlan.isCurrent,
    active: contentPlan.active,
    createdAt: contentPlan.createdAt,
    updatedAt: contentPlan.updatedAt,
    createdBy: contentPlan.createdBy ?? null,
    updatedBy: contentPlan.updatedBy ?? null
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

async function findEditorialLineVersionOrThrow(launchId) {
  const editorialLine = await EditorialLine.findOne({ launchId, isCurrent: true }).sort({ version: -1 });

  if (!editorialLine) {
    throw {
      statusCode: 400,
      message: "Content plan requires an editorial line"
    };
  }

  return editorialLine.version;
}

class ContentPlanService {
  async create(authenticatedUserId, launchId, data) {
    await findLaunchOrThrow(launchId);

    const existingCurrentPlan = await ContentPlan.findOne({ launchId, isCurrent: true }).sort({ version: -1 });

    if (existingCurrentPlan) {
      throw {
        statusCode: 409,
        message: "A current content plan already exists for this launch"
      };
    }

    const editorialLineVersion = await findEditorialLineVersionOrThrow(launchId);
    const contentPlan = await ContentPlan.create({
      launchId,
      version: 1,
      items: normalizeItems(data.items),
      editorialLineVersion,
      isCurrent: true,
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "CONTENT_PLAN_CREATED",
      targetType: "CONTENT_PLAN",
      targetId: contentPlan.id,
      context: {
        launchId,
        version: contentPlan.version,
        items: contentPlan.items.length,
        editorialLineVersion
      }
    });

    return toPublicContentPlan(contentPlan);
  }

  async update(authenticatedUserId, launchId, data) {
    await findLaunchOrThrow(launchId);

    const currentPlan = await ContentPlan.findOne({ launchId, isCurrent: true }).sort({ version: -1 });

    if (!currentPlan) {
      throw {
        statusCode: 404,
        message: "Content plan not found"
      };
    }

    const editorialLineVersion = await findEditorialLineVersionOrThrow(launchId);

    await ContentPlan.updateOne(
      { _id: currentPlan.id },
      {
        $set: {
          isCurrent: false,
          active: false,
          updatedBy: authenticatedUserId
        }
      }
    );

    const contentPlan = await ContentPlan.create({
      launchId,
      version: currentPlan.version + 1,
      items: normalizeItems(data.items),
      editorialLineVersion,
      isCurrent: true,
      active: true,
      createdBy: currentPlan.createdBy ?? authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "CONTENT_PLAN_UPDATED",
      targetType: "CONTENT_PLAN",
      targetId: contentPlan.id,
      context: {
        launchId,
        version: contentPlan.version,
        previousVersion: currentPlan.version,
        items: contentPlan.items.length,
        editorialLineVersion
      }
    });

    return toPublicContentPlan(contentPlan);
  }

  async listByLaunch(launchId) {
    const plans = await ContentPlan.find({ launchId }).sort({ version: -1, createdAt: -1 });
    return plans.map((plan) => toPublicContentPlan(plan));
  }
}

export const contentPlanService = new ContentPlanService();
export { toPublicContentPlan };
