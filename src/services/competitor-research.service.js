import { Launch } from "../models/launch.model.js";
import { CompetitorResearch } from "../models/competitor-research.model.js";
import { auditService } from "./audit.service.js";

function normalizeDate(value) {
  return new Date(value);
}

function toPublicEvidence(evidence) {
  return {
    id: evidence.id,
    channel: evidence.channel,
    headline: evidence.headline,
    promise: evidence.promise,
    trigger: evidence.trigger,
    observations: evidence.observations,
    capturedAt: evidence.capturedAt,
    createdBy: evidence.createdBy ?? null,
    updatedBy: evidence.updatedBy ?? null
  };
}

function toPublicCompetitorResearch(research) {
  return {
    id: research.id,
    launchId: research.launchId,
    competitorName: research.competitorName,
    evidences: research.evidences
      .slice()
      .sort((left, right) => normalizeDate(right.capturedAt).getTime() - normalizeDate(left.capturedAt).getTime())
      .map((evidence) => toPublicEvidence(evidence)),
    active: research.active,
    createdAt: research.createdAt,
    updatedAt: research.updatedAt,
    createdBy: research.createdBy ?? null,
    updatedBy: research.updatedBy ?? null
  };
}

function buildEvidence(payload, authenticatedUserId) {
  return {
    channel: payload.channel.trim(),
    headline: payload.headline.trim(),
    promise: payload.promise.trim(),
    trigger: payload.trigger.trim(),
    observations: payload.observations.trim(),
    capturedAt: normalizeDate(payload.capturedAt),
    createdBy: authenticatedUserId,
    updatedBy: authenticatedUserId
  };
}

function groupByChannelAndDate(researchEntries) {
  const grouped = new Map();

  for (const research of researchEntries) {
    for (const evidence of research.evidences) {
      const channel = evidence.channel;
      const dateKey = normalizeDate(evidence.capturedAt).toISOString();

      if (!grouped.has(channel)) {
        grouped.set(channel, new Map());
      }

      const datesMap = grouped.get(channel);

      if (!datesMap.has(dateKey)) {
        datesMap.set(dateKey, []);
      }

      datesMap.get(dateKey).push({
        competitorName: research.competitorName,
        evidence: toPublicEvidence(evidence)
      });
    }
  }

  return [...grouped.entries()]
    .sort(([leftChannel], [rightChannel]) => leftChannel.localeCompare(rightChannel))
    .map(([channel, datesMap]) => ({
      channel,
      entriesByDate: [...datesMap.entries()]
        .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
        .map(([capturedAt, entries]) => ({
          capturedAt,
          entries: entries.sort((left, right) => left.competitorName.localeCompare(right.competitorName))
        }))
    }));
}

class CompetitorResearchService {
  async create(authenticatedUserId, launchId, data) {
    const launch = await Launch.findById(launchId);

    if (!launch) {
      throw {
        statusCode: 404,
        message: "Launch not found"
      };
    }

    const competitorName = data.competitorName.trim();
    const evidence = buildEvidence(data, authenticatedUserId);

    let research = await CompetitorResearch.findOne({ launchId, competitorName });

    if (!research) {
      research = await CompetitorResearch.create({
        launchId,
        competitorName,
        evidences: [evidence],
        active: true,
        createdBy: authenticatedUserId,
        updatedBy: authenticatedUserId
      });

      await auditService.record({
        actorUserId: authenticatedUserId,
        action: "COMPETITOR_RESEARCH_CREATED",
        targetType: "COMPETITOR_RESEARCH",
        targetId: research.id,
        context: {
          launchId,
          competitorName,
          channel: evidence.channel
        }
      });

      return toPublicCompetitorResearch(research);
    }

    research.evidences.push(evidence);
    research.updatedBy = authenticatedUserId;
    await research.save();

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "COMPETITOR_RESEARCH_EVIDENCE_ADDED",
      targetType: "COMPETITOR_RESEARCH",
      targetId: research.id,
      context: {
        launchId,
        competitorName,
        channel: evidence.channel
      }
    });

    return toPublicCompetitorResearch(research);
  }

  async listByLaunch(launchId) {
    const researchEntries = await CompetitorResearch.find({ launchId, active: true }).sort({ competitorName: 1, updatedAt: -1 });

    return {
      items: researchEntries.map((entry) => toPublicCompetitorResearch(entry)),
      groupedByChannel: groupByChannelAndDate(researchEntries)
    };
  }
}

export const competitorResearchService = new CompetitorResearchService();
export { groupByChannelAndDate, toPublicCompetitorResearch };
