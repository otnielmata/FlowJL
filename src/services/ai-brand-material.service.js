import { AiBrandMaterial } from "../models/ai-brand-material.model.js";
import { Avatar } from "../models/avatar.model.js";
import { EditorialLine } from "../models/editorial-line.model.js";
import { Launch } from "../models/launch.model.js";
import { Offer } from "../models/offer.model.js";
import { Positioning } from "../models/positioning.model.js";
import { auditService } from "./audit.service.js";
import { aiBrandMaterialGeneratorService } from "./ai-brand-material-generator.service.js";

function normalizeText(value) {
  return value.trim();
}

function normalizeSections(sections = []) {
  return sections.map((section) => ({
    label: normalizeText(section.label),
    content: normalizeText(section.content)
  }));
}

function toPublicAiBrandMaterial(material) {
  return {
    id: material.id,
    launchId: material.launchId,
    version: material.version,
    materialType: material.materialType,
    objective: material.objective,
    briefing: material.briefing,
    title: material.title,
    hook: material.hook,
    sections: material.sections.map((section) => ({
      label: section.label,
      content: section.content
    })),
    cta: material.cta,
    reviewNotes: [...(material.reviewNotes ?? [])],
    sourceContext: {
      launchId: material.sourceContext.launchId,
      launchName: material.sourceContext.launchName,
      product: material.sourceContext.product,
      expert: material.sourceContext.expert,
      avatarVersion: material.sourceContext.avatarVersion ?? null,
      editorialLineVersion: material.sourceContext.editorialLineVersion ?? null,
      positioningVersion: material.sourceContext.positioningVersion ?? null,
      offerVersion: material.sourceContext.offerVersion ?? null,
      editorialPillars: [...(material.sourceContext.editorialPillars ?? [])],
      languageCues: [...(material.sourceContext.languageCues ?? [])],
      brandSignals: [...(material.sourceContext.brandSignals ?? [])]
    },
    generatedByAI: material.generatedByAI,
    humanReviewRequired: material.humanReviewRequired,
    reviewStatus: material.reviewStatus,
    active: material.active,
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
    createdBy: material.createdBy ?? null,
    updatedBy: material.updatedBy ?? null
  };
}

async function findLaunchOrThrow(launchId) {
  const launch = await Launch.findById(launchId);

  if (!launch || launch.active === false) {
    throw {
      statusCode: 404,
      message: "Launch not found"
    };
  }

  return launch;
}

async function findBrandContextOrThrow(launchId) {
  const [avatar, editorialLine, positioning, offer] = await Promise.all([
    Avatar.findOne({ launchId, isCurrent: true }).sort({ version: -1 }),
    EditorialLine.findOne({ launchId, isCurrent: true, active: true }).sort({ version: -1 }),
    Positioning.findOne({ launchId, isCurrent: true, active: true }).sort({ version: -1 }),
    Offer.findOne({ launchId, isCurrent: true }).sort({ version: -1 })
  ]);

  if (!avatar || !editorialLine || !positioning) {
    throw {
      statusCode: 400,
      message: "AI brand material generation requires current avatar, editorial line and positioning context"
    };
  }

  return {
    avatar,
    editorialLine,
    positioning,
    offer
  };
}

function buildSourceContext({ launch, avatar, editorialLine, positioning, offer }) {
  const activePillars = editorialLine.pillars.filter((pillar) => pillar.active);

  return {
    launchId: launch.id,
    launchName: launch.name,
    product: launch.product,
    expert: launch.expert,
    avatarVersion: avatar.version,
    editorialLineVersion: editorialLine.version,
    positioningVersion: positioning.version,
    offerVersion: offer?.version ?? null,
    editorialPillars: activePillars.map((pillar) => pillar.name),
    languageCues: avatar.language ?? [],
    brandSignals: [
      positioning.centralPromise,
      ...positioning.differentiators.slice(0, 3),
      ...(offer?.promise ? [offer.promise] : [])
    ].filter(Boolean)
  };
}

async function resolveNextVersion(launchId, materialType) {
  const latest = await AiBrandMaterial.findOne({ launchId, materialType }).sort({ version: -1 });
  return latest ? latest.version + 1 : 1;
}

class AiBrandMaterialService {
  async generate(authenticatedUserId, launchId, data) {
    const launch = await findLaunchOrThrow(launchId);
    const context = await findBrandContextOrThrow(launchId);
    const sourceContext = buildSourceContext({ launch, ...context });
    const materialType = data.materialType.trim().toUpperCase();
    const objective = normalizeText(data.objective);
    const briefing = normalizeText(data.briefing);
    const suggestion = aiBrandMaterialGeneratorService.generate({
      launch,
      materialType,
      objective,
      briefing,
      sourceContext
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AI_BRAND_MATERIAL_GENERATED",
      targetType: "LAUNCH",
      targetId: launch.id,
      context: {
        launchId,
        materialType,
        objective,
        avatarVersion: sourceContext.avatarVersion,
        editorialLineVersion: sourceContext.editorialLineVersion,
        positioningVersion: sourceContext.positioningVersion
      }
    });

    return {
      launchId,
      materialType,
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
        message: "AI brand material source context must match the launch"
      };
    }

    const materialType = data.materialType.trim().toUpperCase();
    const version = await resolveNextVersion(data.launchId, materialType);
    const material = await AiBrandMaterial.create({
      launchId: data.launchId,
      version,
      materialType,
      objective: normalizeText(data.objective),
      briefing: normalizeText(data.briefing),
      title: normalizeText(data.title),
      hook: normalizeText(data.hook),
      sections: normalizeSections(data.sections),
      cta: normalizeText(data.cta),
      reviewNotes: (data.reviewNotes ?? []).map((note) => normalizeText(note)),
      sourceContext: {
        ...data.sourceContext,
        editorialPillars: data.sourceContext.editorialPillars.map((pillar) => normalizeText(pillar)),
        languageCues: data.sourceContext.languageCues.map((cue) => normalizeText(cue)),
        brandSignals: data.sourceContext.brandSignals.map((signal) => normalizeText(signal))
      },
      generatedByAI: true,
      humanReviewRequired: true,
      reviewStatus: "PENDING_REVIEW",
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AI_BRAND_MATERIAL_SAVED",
      targetType: "AI_BRAND_MATERIAL",
      targetId: material.id,
      context: {
        launchId: material.launchId,
        materialType: material.materialType,
        version: material.version,
        reviewStatus: material.reviewStatus
      }
    });

    return toPublicAiBrandMaterial(material);
  }

  async list(filters = {}) {
    const query = {};

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.materialType) {
      query.materialType = filters.materialType;
    }

    if (filters.reviewStatus) {
      query.reviewStatus = filters.reviewStatus;
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    } else {
      query.active = true;
    }

    const materials = await AiBrandMaterial.find(query).sort({ createdAt: -1 });
    return materials.map((material) => toPublicAiBrandMaterial(material));
  }

  async getById(materialId) {
    const material = await AiBrandMaterial.findById(materialId);

    if (!material) {
      throw {
        statusCode: 404,
        message: "AI brand material not found"
      };
    }

    return toPublicAiBrandMaterial(material);
  }
}

export const aiBrandMaterialService = new AiBrandMaterialService();
export { toPublicAiBrandMaterial };
