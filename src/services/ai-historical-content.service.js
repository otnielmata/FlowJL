import { AiHistoricalContent } from "../models/ai-historical-content.model.js";
import { Launch } from "../models/launch.model.js";
import { auditService } from "./audit.service.js";

function normalizeText(value) {
  return value?.trim() ?? null;
}

function normalizeTags(tags = []) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function toPublicHistoricalContent(content) {
  return {
    id: content.id,
    launchId: content.launchId ?? null,
    title: content.title,
    format: content.format,
    objective: content.objective,
    summary: content.summary,
    tags: [...(content.tags ?? [])],
    origin: content.origin,
    reusedFromContentId: content.reusedFromContentId ?? null,
    performance: {
      views: content.performance.views,
      clicks: content.performance.clicks,
      conversions: content.performance.conversions,
      revenue: content.performance.revenue,
      engagementRate: content.performance.engagementRate,
      score: content.performance.score
    },
    active: content.active,
    deactivatedAt: content.deactivatedAt ?? null,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
    createdBy: content.createdBy ?? null,
    updatedBy: content.updatedBy ?? null
  };
}

async function findLaunchOrThrow(launchId) {
  if (!launchId) return null;

  const launch = await Launch.findById(launchId);

  if (!launch || launch.active === false) {
    throw {
      statusCode: 404,
      message: "Launch not found"
    };
  }

  return launch;
}

function buildSearchQuery(filters = {}) {
  const query = {};

  if (filters.launchId) query.launchId = filters.launchId;
  if (filters.format) query.format = filters.format;
  if (filters.origin) query.origin = filters.origin;
  if (filters.objective) query.objective = new RegExp(filters.objective.trim(), "i");
  if (filters.tags?.length) query.tags = { $in: normalizeTags(filters.tags) };
  query.active = filters.active ?? true;

  return query;
}

function scoreCorrelation(content, { launch, objective, format, tags = [] }) {
  let score = content.performance.score;
  const normalizedObjective = objective?.toLowerCase() ?? "";
  const normalizedTitle = `${content.title} ${content.objective} ${content.summary}`.toLowerCase();
  const normalizedTags = normalizeTags(tags).map((tag) => tag.toLowerCase());

  if (format && content.format === format) score += 15;
  if (normalizedObjective && normalizedTitle.includes(normalizedObjective)) score += 10;
  if (launch && normalizedTitle.includes(launch.product.toLowerCase())) score += 8;
  score += content.tags.filter((tag) => normalizedTags.includes(tag.toLowerCase())).length * 5;

  return score;
}

class AiHistoricalContentService {
  async create(authenticatedUserId, data) {
    await findLaunchOrThrow(data.launchId);

    const content = await AiHistoricalContent.create({
      launchId: data.launchId ?? null,
      title: data.title.trim(),
      format: data.format,
      objective: data.objective.trim(),
      summary: data.summary.trim(),
      tags: normalizeTags(data.tags),
      origin: data.origin ?? "ORIGINAL",
      reusedFromContentId: data.reusedFromContentId ?? null,
      performance: data.performance,
      sensitiveNotes: normalizeText(data.sensitiveNotes),
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AI_HISTORICAL_CONTENT_CREATED",
      targetType: "AI_HISTORICAL_CONTENT",
      targetId: content.id,
      context: {
        launchId: content.launchId ?? null,
        format: content.format,
        origin: content.origin,
        score: content.performance.score
      }
    });

    return toPublicHistoricalContent(content);
  }

  async list(authenticatedUserId, filters = {}) {
    const contents = await AiHistoricalContent.find(buildSearchQuery(filters)).sort({ "performance.score": -1, createdAt: -1 });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AI_HISTORICAL_CONTENT_SEARCHED",
      targetType: "AI_HISTORICAL_CONTENT",
      targetId: filters.launchId ?? "GLOBAL",
      context: {
        launchId: filters.launchId ?? null,
        format: filters.format ?? null,
        objective: filters.objective ?? null,
        results: contents.length
      }
    });

    return contents.map((content) => toPublicHistoricalContent(content));
  }

  async getById(contentId) {
    const content = await AiHistoricalContent.findById(contentId);

    if (!content) {
      throw {
        statusCode: 404,
        message: "Historical content not found"
      };
    }

    return toPublicHistoricalContent(content);
  }

  async recommend(authenticatedUserId, data) {
    const launch = await findLaunchOrThrow(data.launchId);
    const candidates = await AiHistoricalContent.find(buildSearchQuery({
      format: data.format,
      objective: data.objective,
      tags: data.tags,
      active: true
    })).sort({ "performance.score": -1, createdAt: -1 });

    const recommendations = candidates
      .map((content) => ({
        content: toPublicHistoricalContent(content),
        reuseType: content.origin === "REUSED" ? "REUSE_CHAIN" : "ADAPT_ORIGINAL",
        correlationScore: scoreCorrelation(content, { launch, objective: data.objective, format: data.format, tags: data.tags }),
        rationale: `Conteudo ${content.format} com score ${content.performance.score} correlacionado ao objetivo "${data.objective}" para o lancamento ${launch.name}.`
      }))
      .sort((left, right) => right.correlationScore - left.correlationScore)
      .slice(0, data.limit ?? 5);

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AI_HISTORICAL_CONTENT_RECOMMENDED",
      targetType: "LAUNCH",
      targetId: launch.id,
      context: {
        launchId: launch.id,
        objective: data.objective,
        format: data.format ?? null,
        recommendations: recommendations.length
      }
    });

    return {
      launchId: launch.id,
      objective: data.objective,
      format: data.format ?? null,
      recommendations
    };
  }

  async deactivate(authenticatedUserId, contentId) {
    const content = await AiHistoricalContent.findById(contentId);

    if (!content) {
      throw {
        statusCode: 404,
        message: "Historical content not found"
      };
    }

    if (!content.active) {
      throw {
        statusCode: 409,
        message: "Historical content is already inactive"
      };
    }

    const deactivatedAt = new Date();
    await AiHistoricalContent.updateOne(
      { _id: contentId },
      {
        $set: {
          active: false,
          deactivatedAt,
          updatedBy: authenticatedUserId
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AI_HISTORICAL_CONTENT_DEACTIVATED",
      targetType: "AI_HISTORICAL_CONTENT",
      targetId: content.id,
      context: {
        launchId: content.launchId ?? null,
        format: content.format,
        origin: content.origin
      }
    });

    return toPublicHistoricalContent({
      ...content.toObject(),
      id: content.id,
      active: false,
      deactivatedAt,
      updatedBy: authenticatedUserId
    });
  }
}

export const aiHistoricalContentService = new AiHistoricalContentService();
export { toPublicHistoricalContent };
