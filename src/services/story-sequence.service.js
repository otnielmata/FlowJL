import { Launch } from "../models/launch.model.js";
import { SmartSchedule } from "../models/smart-schedule.model.js";
import { StorySequence } from "../models/story-sequence.model.js";
import { auditService } from "./audit.service.js";

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function normalizeBlocks(blocks = []) {
  return blocks.map((block, index) => ({
    order: block.order ?? index + 1,
    text: block.text.trim()
  }));
}

function toPublicStorySequence(sequence) {
  return {
    id: sequence.id,
    launchId: sequence.launchId ?? null,
    smartScheduleId: sequence.smartScheduleId ?? null,
    theme: sequence.theme,
    objective: sequence.objective,
    cta: sequence.cta,
    blocksCount: sequence.blocksCount,
    blocks: sequence.blocks.map((block) => ({
      id: block.id,
      order: block.order,
      text: block.text
    })),
    operationalStatus: sequence.operationalStatus,
    ownerRole: sequence.ownerRole ?? null,
    publishAt: sequence.publishAt ?? null,
    active: sequence.active,
    createdAt: sequence.createdAt,
    updatedAt: sequence.updatedAt,
    createdBy: sequence.createdBy ?? null,
    updatedBy: sequence.updatedBy ?? null
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

async function ensureSmartScheduleExists(smartScheduleId) {
  if (!smartScheduleId) {
    return null;
  }

  const smartSchedule = await SmartSchedule.findById(smartScheduleId);

  if (!smartSchedule) {
    throw {
      statusCode: 404,
      message: "Smart schedule not found"
    };
  }

  return smartSchedule;
}

async function resolveContext(data) {
  if (!data.objective.trim()) {
    throw {
      statusCode: 400,
      message: "Story sequence requires objective"
    };
  }

  const [launch, smartSchedule] = await Promise.all([
    ensureLaunchExists(data.launchId ?? null),
    ensureSmartScheduleExists(data.smartScheduleId ?? null)
  ]);

  const resolvedLaunchId = data.launchId ?? smartSchedule?.launchId ?? null;

  if (!resolvedLaunchId && !smartSchedule) {
    throw {
      statusCode: 400,
      message: "Story sequence requires a launch or smart schedule context"
    };
  }

  return {
    launchId: resolvedLaunchId,
    smartScheduleId: smartSchedule?.id ?? data.smartScheduleId ?? null
  };
}

class StorySequenceService {
  async create(authenticatedUserId, data) {
    const context = await resolveContext(data);

    const sequence = await StorySequence.create({
      launchId: context.launchId,
      smartScheduleId: context.smartScheduleId,
      theme: data.theme.trim(),
      objective: data.objective.trim(),
      cta: data.cta.trim(),
      blocksCount: data.blocksCount,
      blocks: normalizeBlocks(data.blocks),
      operationalStatus: data.operationalStatus.trim().toUpperCase(),
      ownerRole: data.ownerRole?.trim() ?? null,
      publishAt: normalizeDate(data.publishAt),
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "STORY_SEQUENCE_CREATED",
      targetType: "STORY_SEQUENCE",
      targetId: sequence.id,
      context: {
        launchId: sequence.launchId ?? null,
        smartScheduleId: sequence.smartScheduleId ?? null,
        blocksCount: sequence.blocksCount,
        operationalStatus: sequence.operationalStatus
      }
    });

    return toPublicStorySequence(sequence);
  }

  async update(authenticatedUserId, sequenceId, data) {
    const sequence = await StorySequence.findById(sequenceId);

    if (!sequence || !sequence.active) {
      throw {
        statusCode: 404,
        message: "Story sequence not found"
      };
    }

    const updates = {
      blocks: normalizeBlocks(data.blocks),
      blocksCount: data.blocksCount,
      operationalStatus: data.operationalStatus.trim().toUpperCase(),
      ownerRole: data.ownerRole?.trim() ?? null,
      publishAt: normalizeDate(data.publishAt),
      updatedBy: authenticatedUserId
    };

    await StorySequence.updateOne(
      { _id: sequenceId },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "STORY_SEQUENCE_UPDATED",
      targetType: "STORY_SEQUENCE",
      targetId: sequence.id,
      context: {
        launchId: sequence.launchId ?? null,
        previousOperationalStatus: sequence.operationalStatus,
        operationalStatus: updates.operationalStatus,
        blocksCount: updates.blocksCount,
        publishAt: updates.publishAt
      }
    });

    return {
      ...toPublicStorySequence(sequence),
      ...updates,
      blocks: updates.blocks.map((block, index) => ({
        id: sequence.blocks[index]?.id ?? undefined,
        order: block.order,
        text: block.text
      }))
    };
  }
}

export const storySequenceService = new StorySequenceService();
export { toPublicStorySequence };
