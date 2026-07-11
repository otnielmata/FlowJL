import { Launch } from "../models/launch.model.js";
import { MarketResearch } from "../models/market-research.model.js";
import { auditService } from "./audit.service.js";
import { marketResearchGeneratorService } from "./market-research-generator.service.js";

function toPublicMarketResearch(research) {
  return {
    id: research.id,
    launchId: research.launchId,
    version: research.version,
    briefing: research.briefing,
    objective: research.objective,
    productContext: research.productContext,
    themes: research.themes.map((theme) => ({
      title: theme.title,
      rationale: theme.rationale
    })),
    promises: research.promises.map((promise) => ({
      title: promise.title,
      rationale: promise.rationale
    })),
    objections: research.objections.map((objection) => ({
      title: objection.title,
      rebuttal: objection.rebuttal
    })),
    ctas: [...research.ctas],
    suggestedFormats: research.suggestedFormats.map((format) => ({
      type: format.type,
      angle: format.angle
    })),
    humanReviewRequired: research.humanReviewRequired,
    createdAt: research.createdAt,
    updatedAt: research.updatedAt,
    createdBy: research.createdBy ?? null,
    updatedBy: research.updatedBy ?? null
  };
}

class MarketResearchService {
  async create(authenticatedUserId, launchId, data) {
    const launch = await Launch.findById(launchId);

    if (!launch) {
      throw {
        statusCode: 404,
        message: "Launch not found"
      };
    }

    const briefing = data.briefing.trim();
    const objective = data.objective.trim();
    const productContext = data.productContext.trim();

    const latestResearch = await MarketResearch.findOne({ launchId }).sort({ version: -1, createdAt: -1 });
    const version = (latestResearch?.version ?? 0) + 1;
    const generatedResearch = marketResearchGeneratorService.generate({
      launch,
      briefing,
      objective,
      productContext
    });

    const research = await MarketResearch.create({
      launchId,
      version,
      briefing,
      objective,
      productContext,
      ...generatedResearch,
      humanReviewRequired: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "MARKET_RESEARCH_GENERATED",
      targetType: "MARKET_RESEARCH",
      targetId: research.id,
      context: {
        launchId,
        version
      }
    });

    return toPublicMarketResearch(research);
  }

  async listByLaunch(launchId) {
    const researchEntries = await MarketResearch.find({ launchId }).sort({ version: -1, createdAt: -1 });
    return researchEntries.map((entry) => toPublicMarketResearch(entry));
  }
}

export const marketResearchService = new MarketResearchService();
export { toPublicMarketResearch };
