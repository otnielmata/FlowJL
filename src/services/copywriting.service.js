import { Avatar } from "../models/avatar.model.js";
import { Copywriting } from "../models/copywriting.model.js";
import { EditorialLine } from "../models/editorial-line.model.js";
import { Launch } from "../models/launch.model.js";
import { Offer } from "../models/offer.model.js";
import { Positioning } from "../models/positioning.model.js";
import { auditService } from "./audit.service.js";
import { copywritingGeneratorService } from "./copywriting-generator.service.js";

function normalizeReviewNotes(notes = []) {
  return notes.map((note) => note.trim());
}

function normalizeBodySections(sections = []) {
  return sections.map((section) => ({
    label: section.label.trim(),
    content: section.content.trim()
  }));
}

function toPublicCopywriting(copy) {
  return {
    id: copy.id,
    launchId: copy.launchId,
    format: copy.format,
    objective: copy.objective,
    briefing: copy.briefing,
    headline: copy.headline,
    hook: copy.hook,
    bodySections: copy.bodySections.map((section) => ({
      label: section.label,
      content: section.content
    })),
    cta: copy.cta,
    reviewNotes: [...copy.reviewNotes],
    sourceContext: {
      ...copy.sourceContext
    },
    generatedByAI: copy.generatedByAI,
    humanReviewRequired: copy.humanReviewRequired,
    active: copy.active,
    createdAt: copy.createdAt,
    updatedAt: copy.updatedAt,
    createdBy: copy.createdBy ?? null,
    updatedBy: copy.updatedBy ?? null
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

async function findStrategicContextOrThrow(launchId) {
  const [offer, positioning, editorialLine, avatar] = await Promise.all([
    Offer.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    Positioning.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    EditorialLine.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    Avatar.findOne({ launchId, isCurrent: true }).sort({ version: -1 })
  ]);

  if (!offer || !positioning) {
    throw {
      statusCode: 400,
      message: "Copywriting generation requires current offer and positioning context"
    };
  }

  return {
    offer,
    positioning,
    editorialLine,
    avatar
  };
}

function buildSourceContext({ launch, offer, positioning, editorialLine, avatar }) {
  return {
    launchId: launch.id,
    launchName: launch.name,
    product: launch.product,
    expert: launch.expert,
    offerVersion: offer.version,
    positioningVersion: positioning.version,
    editorialLineVersion: editorialLine?.version ?? null,
    avatarVersion: avatar?.version ?? null,
    editorialPillars: editorialLine?.pillars.filter((pillar) => pillar.active).map((pillar) => pillar.name) ?? [],
    languageCues: avatar?.language ?? []
  };
}

class CopywritingService {
  async generate(authenticatedUserId, launchId, data) {
    const launch = await findLaunchOrThrow(launchId);
    const strategicContext = await findStrategicContextOrThrow(launchId);
    const sourceContext = buildSourceContext({
      launch,
      ...strategicContext
    });

    const format = data.format.trim().toUpperCase();
    const objective = data.objective.trim();
    const briefing = data.briefing.trim();
    const suggestion = copywritingGeneratorService.generate({
      launch,
      format,
      objective,
      briefing,
      sourceContext,
      positioning: strategicContext.positioning,
      offer: strategicContext.offer
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "COPYWRITING_GENERATED",
      targetType: "LAUNCH",
      targetId: launch.id,
      context: {
        launchId,
        format,
        objective,
        offerVersion: strategicContext.offer.version,
        positioningVersion: strategicContext.positioning.version
      }
    });

    return {
      launchId,
      format,
      objective,
      briefing,
      sourceContext,
      suggestion,
      humanReviewRequired: true
    };
  }

  async create(authenticatedUserId, data) {
    await findLaunchOrThrow(data.launchId);

    if (data.sourceContext.launchId !== data.launchId) {
      throw {
        statusCode: 400,
        message: "Copywriting source context must match the launch"
      };
    }

    const copywriting = await Copywriting.create({
      launchId: data.launchId,
      format: data.format.trim().toUpperCase(),
      objective: data.objective.trim(),
      briefing: data.briefing.trim(),
      headline: data.headline.trim(),
      hook: data.hook.trim(),
      bodySections: normalizeBodySections(data.bodySections),
      cta: data.cta.trim(),
      reviewNotes: normalizeReviewNotes(data.reviewNotes),
      sourceContext: {
        ...data.sourceContext,
        editorialPillars: data.sourceContext.editorialPillars.map((pillar) => pillar.trim()),
        languageCues: data.sourceContext.languageCues.map((cue) => cue.trim())
      },
      generatedByAI: true,
      humanReviewRequired: true,
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "COPYWRITING_SAVED",
      targetType: "COPYWRITING",
      targetId: copywriting.id,
      context: {
        launchId: copywriting.launchId,
        format: copywriting.format,
        offerVersion: copywriting.sourceContext.offerVersion,
        positioningVersion: copywriting.sourceContext.positioningVersion
      }
    });

    return toPublicCopywriting(copywriting);
  }
}

export const copywritingService = new CopywritingService();
export { toPublicCopywriting };
