import { AiHistoricalContent } from "../models/ai-historical-content.model.js";
import { AiMetricInsight } from "../models/ai-metric-insight.model.js";
import { Launch } from "../models/launch.model.js";
import { TrafficReportSnapshot } from "../models/traffic-report-snapshot.model.js";
import { auditService } from "./audit.service.js";

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function numberOrZero(value) {
  return Number(value ?? 0);
}

function roundMetric(value) {
  return Math.round(value * 10000) / 10000;
}

function calculateRates(metrics) {
  return {
    ctr: metrics.impressions > 0 ? roundMetric(metrics.clicks / metrics.impressions) : 0,
    conversionRate: metrics.clicks > 0 ? roundMetric(metrics.conversions / metrics.clicks) : 0,
    costPerConversion: metrics.conversions > 0 ? roundMetric(metrics.spend / metrics.conversions) : 0,
    roas: metrics.spend > 0 ? roundMetric(metrics.revenue / metrics.spend) : 0
  };
}

function summarizeTrafficSnapshots(snapshots) {
  const metrics = {
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spend: 0,
    revenue: 0
  };
  let periodStart = null;
  let periodEnd = null;
  let latestExternalSyncAt = null;

  for (const snapshot of snapshots) {
    metrics.impressions += numberOrZero(snapshot.metrics?.impressions);
    metrics.clicks += numberOrZero(snapshot.metrics?.clicks);
    metrics.conversions += numberOrZero(snapshot.metrics?.conversions);
    metrics.spend += numberOrZero(snapshot.metrics?.spend);
    metrics.revenue += numberOrZero(snapshot.metrics?.revenue);

    if (!periodStart || snapshot.periodStart < periodStart) periodStart = snapshot.periodStart;
    if (!periodEnd || snapshot.periodEnd > periodEnd) periodEnd = snapshot.periodEnd;
    if (snapshot.syncedAt && (!latestExternalSyncAt || snapshot.syncedAt > latestExternalSyncAt)) {
      latestExternalSyncAt = snapshot.syncedAt;
    }
  }

  return {
    snapshotsCount: snapshots.length,
    metrics,
    rates: calculateRates(metrics),
    periodStart,
    periodEnd,
    latestExternalSyncAt,
    sources: [...new Set(snapshots.map((snapshot) => snapshot.source).filter(Boolean))]
  };
}

function summarizeHistoricalContents(contents) {
  const topContents = [...contents]
    .sort((left, right) => right.performance.score - left.performance.score)
    .slice(0, 5);
  const formatCounts = contents.reduce((accumulator, content) => {
    accumulator[content.format] = (accumulator[content.format] ?? 0) + 1;
    return accumulator;
  }, {});
  const scoreTotal = contents.reduce((sum, content) => sum + numberOrZero(content.performance?.score), 0);

  return {
    contentsCount: contents.length,
    averageScore: contents.length > 0 ? roundMetric(scoreTotal / contents.length) : 0,
    topFormats: Object.entries(formatCounts)
      .map(([format, count]) => ({ format, count }))
      .sort((left, right) => right.count - left.count),
    topContentRefs: topContents.map((content) => ({
      id: content.id,
      title: content.title,
      format: content.format,
      objective: content.objective,
      origin: content.origin,
      score: content.performance.score
    }))
  };
}

function buildTrafficQuery({ launchId, periodStart, periodEnd }) {
  const query = {
    active: true
  };

  if (launchId) query.launchId = launchId;
  if (periodStart || periodEnd) {
    query.periodStart = {};
    query.periodEnd = {};
    if (periodEnd) query.periodStart.$lte = periodEnd;
    if (periodStart) query.periodEnd.$gte = periodStart;
  }

  return query;
}

function buildContentQuery({ launchId, tags }) {
  const query = {
    active: true
  };

  if (launchId) query.launchId = launchId;
  if (tags?.length) query.tags = { $in: tags };

  return query;
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

function ensureEnoughHistoricalBasis(snapshots, contents) {
  const evidenceCount = snapshots.length + contents.length;
  const hasTrafficMetrics = snapshots.some((snapshot) =>
    numberOrZero(snapshot.metrics?.impressions) > 0 ||
    numberOrZero(snapshot.metrics?.clicks) > 0 ||
    numberOrZero(snapshot.metrics?.conversions) > 0 ||
    numberOrZero(snapshot.metrics?.spend) > 0 ||
    numberOrZero(snapshot.metrics?.revenue) > 0
  );
  const hasContentMetrics = contents.some((content) => numberOrZero(content.performance?.score) > 0);

  if (evidenceCount < 2 || (!hasTrafficMetrics && !hasContentMetrics)) {
    throw {
      statusCode: 422,
      message: "AI metric insights require sufficient historical metrics"
    };
  }
}

function evidenceRef(sourceType, sourceId, label, metric, value) {
  return {
    sourceType,
    sourceId,
    label,
    metric,
    value: roundMetric(value)
  };
}

function createSuggestions({ objective, focusArea, traffic, content }) {
  const suggestions = [];

  if (traffic.snapshotsCount > 0 && ["GENERAL", "TRAFFIC", "REVENUE"].includes(focusArea)) {
    if (traffic.metrics.spend > 0 && traffic.rates.roas > 0 && traffic.rates.roas < 1.5) {
      suggestions.push({
        title: "Revisar alocacao de investimento antes de escalar",
        category: "TRAFFIC_EFFICIENCY",
        priority: "HIGH",
        recommendation: "Priorize campanhas e criativos com melhor ROAS antes de aumentar investimento.",
        justification: `A base historica apresenta ROAS ${traffic.rates.roas}, abaixo do patamar minimo recomendado para escala segura.`,
        humanReviewRequired: true,
        evidenceRefs: [
          evidenceRef("AGGREGATED_METRIC", null, "ROAS historico consolidado", "roas", traffic.rates.roas),
          evidenceRef("AGGREGATED_METRIC", null, "Investimento historico", "spend", traffic.metrics.spend)
        ]
      });
    }

    if (traffic.metrics.impressions > 0 && traffic.rates.ctr < 0.015) {
      suggestions.push({
        title: "Testar novos angulos de criativo",
        category: "CREATIVE_PERFORMANCE",
        priority: "MEDIUM",
        recommendation: "Crie variações de promessa, gancho e prova para melhorar a taxa de cliques.",
        justification: `O CTR historico consolidado foi ${traffic.rates.ctr}, indicando oportunidade de melhorar a atracao inicial.`,
        humanReviewRequired: true,
        evidenceRefs: [
          evidenceRef("AGGREGATED_METRIC", null, "CTR historico consolidado", "ctr", traffic.rates.ctr),
          evidenceRef("AGGREGATED_METRIC", null, "Impressoes historicas", "impressions", traffic.metrics.impressions)
        ]
      });
    }
  }

  if (traffic.snapshotsCount > 0 && ["GENERAL", "CONVERSION", "REVENUE"].includes(focusArea) && traffic.metrics.clicks > 0 && traffic.rates.conversionRate < 0.05) {
    suggestions.push({
      title: "Revisar oferta e etapa de conversao",
      category: "CONVERSION",
      priority: "HIGH",
      recommendation: "Analise pagina, checkout, promessa e clareza da oferta antes do proximo lancamento.",
      justification: `A taxa de conversao historica foi ${traffic.rates.conversionRate}, com ${traffic.metrics.clicks} cliques e ${traffic.metrics.conversions} conversoes.`,
      humanReviewRequired: true,
      evidenceRefs: [
        evidenceRef("AGGREGATED_METRIC", null, "Taxa de conversao historica", "conversionRate", traffic.rates.conversionRate),
        evidenceRef("AGGREGATED_METRIC", null, "Conversoes historicas", "conversions", traffic.metrics.conversions)
      ]
    });
  }

  if (content.contentsCount > 0 && ["GENERAL", "CONTENT"].includes(focusArea)) {
    const topContent = content.topContentRefs[0];
    const topFormat = content.topFormats[0];

    if (topContent) {
      suggestions.push({
        title: "Reaproveitar padroes dos conteudos de maior desempenho",
        category: "CONTENT_REUSE",
        priority: topContent.score >= 80 ? "HIGH" : "MEDIUM",
        recommendation: `Use o formato ${topFormat?.format ?? topContent.format} como referencia para novas pecas do objetivo "${objective}".`,
        justification: `O conteudo "${topContent.title}" teve score historico ${topContent.score}, tornando-o uma base auditavel para melhoria.`,
        humanReviewRequired: true,
        evidenceRefs: [
          evidenceRef("HISTORICAL_CONTENT", topContent.id, topContent.title, "performance.score", topContent.score),
          evidenceRef("AGGREGATED_METRIC", null, "Score medio do acervo historico", "averageScore", content.averageScore)
        ]
      });
    }
  }

  if (suggestions.length === 0) {
    suggestions.push({
      title: "Manter aprendizado historico como checklist de decisao",
      category: "OPERATIONS",
      priority: "LOW",
      recommendation: "Use a base consolidada como checklist de revisao humana antes de aprovar novas acoes.",
      justification: "A base historica possui contexto suficiente, mas nao apresentou alerta critico pelos limiares atuais.",
      humanReviewRequired: true,
      evidenceRefs: [
        evidenceRef("AGGREGATED_METRIC", null, "Evidencias historicas avaliadas", "evidenceCount", traffic.snapshotsCount + content.contentsCount)
      ]
    });
  }

  return suggestions;
}

function toPublicMetricInsight(insight) {
  return {
    id: insight.id,
    launchId: insight.launchId ?? null,
    objective: insight.objective,
    focusArea: insight.focusArea,
    periodStart: insight.periodStart ?? null,
    periodEnd: insight.periodEnd ?? null,
    suggestions: insight.suggestions.map((suggestion) => ({
      id: suggestion.id,
      title: suggestion.title,
      category: suggestion.category,
      priority: suggestion.priority,
      recommendation: suggestion.recommendation,
      justification: suggestion.justification,
      humanReviewRequired: suggestion.humanReviewRequired,
      evidenceRefs: suggestion.evidenceRefs
    })),
    historicalBasis: insight.historicalBasis,
    generatedByAI: insight.generatedByAI,
    humanReviewRequired: insight.humanReviewRequired,
    active: insight.active,
    createdAt: insight.createdAt,
    updatedAt: insight.updatedAt,
    createdBy: insight.createdBy ?? null,
    updatedBy: insight.updatedBy ?? null
  };
}

class AiMetricInsightService {
  async generate(authenticatedUserId, data) {
    await findLaunchOrThrow(data.launchId);

    const periodStart = normalizeDate(data.periodStart);
    const periodEnd = normalizeDate(data.periodEnd);

    if (periodStart && periodEnd && periodStart.getTime() > periodEnd.getTime()) {
      throw {
        statusCode: 400,
        message: "periodStart must be before or equal to periodEnd"
      };
    }

    const [snapshots, contents] = await Promise.all([
      TrafficReportSnapshot.find(buildTrafficQuery({ launchId: data.launchId, periodStart, periodEnd })).sort({ syncedAt: -1 }),
      AiHistoricalContent.find(buildContentQuery({ launchId: data.launchId, tags: data.tags })).sort({ "performance.score": -1, createdAt: -1 })
    ]);

    ensureEnoughHistoricalBasis(snapshots, contents);

    const traffic = summarizeTrafficSnapshots(snapshots);
    const content = summarizeHistoricalContents(contents);
    const historicalBasis = {
      traffic,
      content,
      evidenceSummary: {
        totalEvidenceItems: snapshots.length + contents.length,
        includesTrafficMetrics: snapshots.length > 0,
        includesHistoricalContent: contents.length > 0
      }
    };
    const suggestions = createSuggestions({
      objective: data.objective,
      focusArea: data.focusArea,
      traffic,
      content
    });

    const insight = await AiMetricInsight.create({
      launchId: data.launchId ?? null,
      objective: data.objective.trim(),
      focusArea: data.focusArea,
      periodStart,
      periodEnd,
      suggestions,
      historicalBasis,
      internalProcessingNotes: `Generated from ${snapshots.length} traffic snapshots and ${contents.length} historical contents.`,
      generatedByAI: true,
      humanReviewRequired: true,
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AI_METRIC_INSIGHT_GENERATED",
      targetType: "AI_METRIC_INSIGHT",
      targetId: insight.id,
      context: {
        launchId: insight.launchId ?? null,
        focusArea: insight.focusArea,
        suggestions: insight.suggestions.length,
        evidenceItems: snapshots.length + contents.length
      }
    });

    return toPublicMetricInsight(insight);
  }

  async getById(authenticatedUserId, insightId) {
    const insight = await AiMetricInsight.findById(insightId);

    if (!insight || insight.active === false) {
      throw {
        statusCode: 404,
        message: "AI metric insight not found"
      };
    }

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AI_METRIC_INSIGHT_READ",
      targetType: "AI_METRIC_INSIGHT",
      targetId: insight.id,
      context: {
        launchId: insight.launchId ?? null,
        focusArea: insight.focusArea
      }
    });

    return toPublicMetricInsight(insight);
  }
}

export const aiMetricInsightService = new AiMetricInsightService();
export { calculateRates, toPublicMetricInsight };
