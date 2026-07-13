import { randomUUID } from "node:crypto";

import { AuditEvent } from "../models/audit-event.model.js";
import { ContentPlan } from "../models/content-plan.model.js";
import { EditorialLine } from "../models/editorial-line.model.js";
import { ExpertApproval } from "../models/expert-approval.model.js";
import { Launch } from "../models/launch.model.js";
import { Offer } from "../models/offer.model.js";
import { Positioning } from "../models/positioning.model.js";
import { SmartSchedule } from "../models/smart-schedule.model.js";
import { Strategy } from "../models/strategy.model.js";
import { User } from "../models/user.model.js";
import { auditService } from "./audit.service.js";
import { toPublicContentPlan } from "./content-plan.service.js";
import { toPublicEditorialLine } from "./editorial-line.service.js";
import { toPublicExpertApproval } from "./expert-approval.service.js";
import { toPublicLaunch } from "./launch.service.js";
import { toPublicOffer } from "./offer.service.js";
import { toPublicPositioning } from "./positioning.service.js";
import { toPublicSmartSchedule } from "./smart-schedule.service.js";

const strategyStepDefinitions = [
  { key: "overview", label: "Visao geral" },
  { key: "persona", label: "Persona" },
  { key: "offer", label: "Oferta" },
  { key: "positioning", label: "Posicionamento" },
  { key: "editorialLine", label: "Linha editorial" },
  { key: "references", label: "Referencias" },
  { key: "contents", label: "Conteudos" },
  { key: "schedule", label: "Cronograma" }
];

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(values) {
  return ensureArray(values).map((item) => normalizeString(item)).filter(Boolean);
}

function normalizeReferences(references) {
  return ensureArray(references).map((reference) => ({
    id: reference.id ?? randomUUID(),
    title: normalizeString(reference.title),
    type: normalizeString(reference.type) || "GENERAL",
    url: normalizeString(reference.url) || null,
    notes: normalizeString(reference.notes) || null
  })).filter((reference) => reference.title);
}

function createDefaultDraft(launch, data = {}) {
  return {
    overview: {
      objective: normalizeString(data.overview?.objective),
      briefing: normalizeString(data.overview?.briefing),
      promise: normalizeString(data.overview?.promise),
      launchName: launch.name,
      product: launch.product,
      expert: launch.expert
    },
    persona: {
      segment: normalizeString(data.persona?.segment),
      pains: normalizeStringArray(data.persona?.pains),
      desires: normalizeStringArray(data.persona?.desires),
      objections: normalizeStringArray(data.persona?.objections)
    },
    offer: {
      productName: normalizeString(data.offer?.productName) || launch.product,
      transformation: normalizeString(data.offer?.transformation),
      promise: normalizeString(data.offer?.promise),
      benefits: normalizeStringArray(data.offer?.benefits),
      differentials: normalizeStringArray(data.offer?.differentials)
    },
    positioning: {
      thesis: normalizeString(data.positioning?.thesis),
      centralPromise: normalizeString(data.positioning?.centralPromise),
      differentiators: normalizeStringArray(data.positioning?.differentiators)
    },
    editorialLine: {
      pillars: ensureArray(data.editorialLine?.pillars).map((pillar) => ({
        name: normalizeString(pillar.name),
        angle: normalizeString(pillar.angle),
        active: pillar.active ?? true
      })).filter((pillar) => pillar.name)
    },
    references: normalizeReferences(data.references),
    contents: {
      keyFormats: normalizeStringArray(data.contents?.keyFormats),
      priorityThemes: normalizeStringArray(data.contents?.priorityThemes),
      ctas: normalizeStringArray(data.contents?.ctas)
    },
    schedule: {
      timelineSummary: normalizeString(data.schedule?.timelineSummary),
      deliveryCadence: normalizeString(data.schedule?.deliveryCadence),
      checkpoints: normalizeStringArray(data.schedule?.checkpoints)
    }
  };
}

function buildHistoryEntry(action, description, actorUserId, metadata = {}) {
  return {
    id: randomUUID(),
    action,
    description,
    actorUserId,
    metadata,
    occurredAt: new Date()
  };
}

function evaluateStepCompletion(key, draft) {
  switch (key) {
    case "overview":
      return normalizeString(draft.overview?.objective) && normalizeString(draft.overview?.briefing) ? 100 : 50;
    case "persona":
      return normalizeString(draft.persona?.segment) && ensureArray(draft.persona?.pains).length && ensureArray(draft.persona?.desires).length ? 100 : 0;
    case "offer":
      return normalizeString(draft.offer?.transformation) && normalizeString(draft.offer?.promise) ? 100 : 0;
    case "positioning":
      return normalizeString(draft.positioning?.thesis) && normalizeString(draft.positioning?.centralPromise) ? 100 : 0;
    case "editorialLine":
      return ensureArray(draft.editorialLine?.pillars).length ? 100 : 0;
    case "references":
      return ensureArray(draft.references).length ? 100 : 0;
    case "contents":
      return ensureArray(draft.contents?.keyFormats).length && ensureArray(draft.contents?.priorityThemes).length ? 100 : 0;
    case "schedule":
      return normalizeString(draft.schedule?.timelineSummary) && normalizeString(draft.schedule?.deliveryCadence) ? 100 : 0;
    default:
      return 0;
  }
}

function buildSteps(draft, previousSteps = []) {
  return strategyStepDefinitions.map((definition) => {
    const previousStep = previousSteps.find((step) => step.key === definition.key);
    const completion = evaluateStepCompletion(definition.key, draft);
    const status = completion === 100 ? "COMPLETED" : completion > 0 ? "IN_PROGRESS" : "PENDING";

    return {
      key: definition.key,
      label: definition.label,
      status,
      completion,
      lastSavedAt: previousStep?.lastSavedAt ?? null,
      completedAt: status === "COMPLETED" ? previousStep?.completedAt ?? new Date() : null
    };
  });
}

function deriveStrategyStatus({ archivedAt, approvalStatus, completionPercentage }) {
  if (archivedAt) {
    return "ARCHIVED";
  }

  if (approvalStatus === "APPROVED") {
    return "APPROVED";
  }

  if (approvalStatus === "IN_REVIEW") {
    return "IN_REVIEW";
  }

  if (completionPercentage === 100) {
    return "READY_FOR_APPROVAL";
  }

  if (completionPercentage > 0) {
    return "IN_PROGRESS";
  }

  return "DRAFT";
}

function calculateCompletionPercentage(steps) {
  if (!steps.length) {
    return 0;
  }

  const total = steps.reduce((sum, step) => sum + step.completion, 0);
  return Math.round(total / steps.length);
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

async function findStrategyOrThrow(strategyId) {
  const strategy = await Strategy.findById(strategyId);

  if (!strategy) {
    throw {
      statusCode: 404,
      message: "Strategy not found"
    };
  }

  return strategy;
}

async function findUserSummary(userId) {
  if (!userId) {
    return null;
  }

  const user = await User.findById(userId);

  if (!user) {
    return {
      id: userId,
      name: "Usuario removido"
    };
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}

function toPublicReference(reference) {
  return {
    id: reference.id,
    title: reference.title,
    type: reference.type,
    url: reference.url ?? null,
    notes: reference.notes ?? null
  };
}

function toPublicComment(comment, author) {
  return {
    id: comment.id,
    authorUserId: comment.authorUserId,
    author,
    message: comment.message,
    createdAt: comment.createdAt
  };
}

function toPublicHistoryEntry(entry) {
  return {
    id: entry.id,
    action: entry.action,
    description: entry.description,
    actorUserId: entry.actorUserId ?? null,
    metadata: entry.metadata ?? {},
    occurredAt: entry.occurredAt
  };
}

async function toPublicStrategyListItem(strategy) {
  const [responsible, launch] = await Promise.all([
    findUserSummary(strategy.responsibleUserId),
    Launch.findById(strategy.launchId)
  ]);

  return {
    id: strategy.id,
    title: strategy.title,
    status: strategy.status,
    completionPercentage: strategy.completionPercentage,
    pendingChanges: strategy.pendingChanges,
    responsible,
    launch: launch
      ? {
          id: launch.id,
          name: launch.name,
          product: launch.product,
          expert: launch.expert
        }
      : {
          id: strategy.launchId,
          name: strategy.title,
          product: strategy.product,
          expert: strategy.expert
        },
    updatedAt: strategy.updatedAt,
    createdAt: strategy.createdAt
  };
}

function buildAvailableActions(roleCode, status) {
  const canManage = ["ADMIN", "DIGITAL_STRATEGIST"].includes(roleCode);
  const isArchived = status === "ARCHIVED";

  return {
    canEdit: canManage && !isArchived,
    canDuplicate: canManage,
    canArchive: canManage && !isArchived,
    canSubmitForApproval: canManage && ["READY_FOR_APPROVAL", "REJECTED"].includes(status),
    canGenerateAiContent: canManage && !isArchived
  };
}

function createAiSuggestions(strategy) {
  const personaSegment = normalizeString(strategy.draft?.persona?.segment) || "publico principal";
  const promise = normalizeString(strategy.draft?.offer?.promise) || normalizeString(strategy.draft?.overview?.promise) || "transformacao central";
  const thesis = normalizeString(strategy.draft?.positioning?.thesis) || "tese estrategica";
  const formats = normalizeStringArray(strategy.draft?.contents?.keyFormats);

  const selectedFormats = formats.length ? formats.slice(0, 3) : ["Reel", "Carrossel", "Email"];

  return selectedFormats.map((format, index) => ({
    id: randomUUID(),
    format,
    title: `${format} ${index + 1} para ${strategy.product}`,
    angle: `${promise} com foco em ${personaSegment}`,
    hook: `Como ${personaSegment} pode avancar mais rapido a partir de ${thesis.toLowerCase()}.`,
    cta: `Conectar com o proximo passo do lancamento ${strategy.title}.`
  }));
}

class StrategyService {
  async create(authenticatedUserId, data) {
    const launch = await findLaunchOrThrow(data.launchId);
    const draft = createDefaultDraft(launch, data.draft);
    draft.references = normalizeReferences(data.draft?.references);

    const steps = buildSteps(draft);
    const completionPercentage = calculateCompletionPercentage(steps);
    const strategy = await Strategy.create({
      launchId: launch.id,
      title: normalizeString(data.title),
      product: launch.product,
      expert: launch.expert,
      responsibleUserId: data.responsibleUserId ?? authenticatedUserId,
      status: deriveStrategyStatus({
        archivedAt: null,
        approvalStatus: "NOT_SUBMITTED",
        completionPercentage
      }),
      completionPercentage,
      pendingChanges: false,
      lastAutoSavedAt: null,
      steps,
      draft,
      references: draft.references,
      comments: [],
      history: [
        buildHistoryEntry("STRATEGY_CREATED", "Estrategia criada em fluxo estruturado", authenticatedUserId, {
          launchId: launch.id
        })
      ],
      approval: {
        status: "NOT_SUBMITTED",
        submittedAt: null,
        submittedBy: null,
        decidedAt: null,
        decidedBy: null
      },
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "STRATEGY_CREATED",
      targetType: "STRATEGY",
      targetId: strategy.id,
      context: {
        launchId: strategy.launchId,
        responsibleUserId: strategy.responsibleUserId,
        completionPercentage: strategy.completionPercentage
      }
    });

    return this.getById(strategy.id, { code: "DIGITAL_STRATEGIST" });
  }

  async list(filters = {}) {
    const strategies = await Strategy.find({ active: filters.active ?? true }).sort({ updatedAt: -1, createdAt: -1 });
    const enrichedStrategies = await Promise.all(strategies.map((strategy) => toPublicStrategyListItem(strategy)));

    return enrichedStrategies.filter((strategy) => {
      if (filters.status && strategy.status !== filters.status) {
        return false;
      }

      if (filters.launchId && strategy.launch.id !== filters.launchId) {
        return false;
      }

      if (filters.responsibleUserId && strategy.responsible?.id !== filters.responsibleUserId) {
        return false;
      }

      if (filters.search) {
        const search = filters.search.toLowerCase();
        const haystack = [
          strategy.title,
          strategy.launch.name,
          strategy.launch.product,
          strategy.launch.expert,
          strategy.responsible?.name ?? ""
        ].join(" ").toLowerCase();

        return haystack.includes(search);
      }

      return true;
    });
  }

  async getById(strategyId, currentRole = { code: "DIGITAL_STRATEGIST" }) {
    const strategy = await findStrategyOrThrow(strategyId);
    const [launch, responsible, currentOffer, currentPositioning, currentEditorialLine, currentContentPlan, currentSmartSchedule, currentApproval, auditEvents] = await Promise.all([
      findLaunchOrThrow(strategy.launchId),
      findUserSummary(strategy.responsibleUserId),
      Offer.findOne({ launchId: strategy.launchId, isCurrent: true }).sort({ version: -1 }),
      Positioning.findOne({ launchId: strategy.launchId, isCurrent: true }).sort({ version: -1 }),
      EditorialLine.findOne({ launchId: strategy.launchId, isCurrent: true }).sort({ version: -1 }),
      ContentPlan.findOne({ launchId: strategy.launchId, isCurrent: true }).sort({ version: -1 }),
      SmartSchedule.findOne({ launchId: strategy.launchId, isCurrent: true }).sort({ version: -1 }),
      ExpertApproval.findOne({ launchId: strategy.launchId, isCurrent: true }).sort({ version: -1 }),
      AuditEvent.find({ targetType: "STRATEGY", targetId: strategy.id }).sort({ occurredAt: -1 })
    ]);

    const commentAuthors = await Promise.all(strategy.comments.map((comment) => findUserSummary(comment.authorUserId)));

    return {
      id: strategy.id,
      title: strategy.title,
      status: strategy.status,
      completionPercentage: strategy.completionPercentage,
      pendingChanges: strategy.pendingChanges,
      lastAutoSavedAt: strategy.lastAutoSavedAt,
      launch: toPublicLaunch(launch),
      responsible,
      approval: {
        ...strategy.approval,
        currentExpertApproval: currentApproval ? toPublicExpertApproval(currentApproval) : null
      },
      steps: strategy.steps.map((step) => ({
        key: step.key,
        label: step.label,
        status: step.status,
        completion: step.completion,
        lastSavedAt: step.lastSavedAt,
        completedAt: step.completedAt
      })),
      tabs: {
        overview: strategy.draft.overview,
        persona: strategy.draft.persona,
        offer: currentOffer ? toPublicOffer(currentOffer) : strategy.draft.offer,
        positioning: currentPositioning ? toPublicPositioning(currentPositioning) : strategy.draft.positioning,
        editorialLine: currentEditorialLine ? toPublicEditorialLine(currentEditorialLine) : strategy.draft.editorialLine,
        references: strategy.references.map((reference) => toPublicReference(reference)),
        contents: {
          draft: strategy.draft.contents,
          currentPlan: currentContentPlan ? toPublicContentPlan(currentContentPlan) : null
        },
        schedule: {
          draft: strategy.draft.schedule,
          currentSchedule: currentSmartSchedule ? toPublicSmartSchedule(currentSmartSchedule) : null
        },
        history: [
          ...strategy.history.map((entry) => toPublicHistoryEntry(entry)),
          ...auditEvents.map((event) => ({
            id: event.id,
            action: event.action,
            description: event.action,
            actorUserId: event.actorUserId ?? null,
            metadata: event.context ?? {},
            occurredAt: event.occurredAt
          }))
        ].sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()),
        comments: strategy.comments.map((comment, index) => toPublicComment(comment, commentAuthors[index]))
      },
      actions: buildAvailableActions(currentRole.code ?? "DIGITAL_STRATEGIST", strategy.status),
      linkedEntities: {
        offerVersion: currentOffer?.version ?? null,
        positioningVersion: currentPositioning?.version ?? null,
        editorialLineVersion: currentEditorialLine?.version ?? null,
        contentPlanVersion: currentContentPlan?.version ?? null,
        smartScheduleVersion: currentSmartSchedule?.version ?? null
      },
      createdAt: strategy.createdAt,
      updatedAt: strategy.updatedAt
    };
  }

  async saveDraft(authenticatedUserId, strategyId, data) {
    const strategy = await findStrategyOrThrow(strategyId);

    if (strategy.status === "ARCHIVED") {
      throw {
        statusCode: 409,
        message: "Archived strategies cannot be edited"
      };
    }

    const nextDraft = {
      ...strategy.draft,
      [data.stepKey]: data.stepKey === "references" ? normalizeReferences(data.data) : data.data
    };

    const nextReferences = data.stepKey === "references" ? normalizeReferences(data.data) : strategy.references;
    nextDraft.references = nextReferences;

    const nextSteps = buildSteps(nextDraft, strategy.steps).map((step) =>
      step.key === data.stepKey
        ? {
            ...step,
            lastSavedAt: new Date()
          }
        : step
    );

    const completionPercentage = calculateCompletionPercentage(nextSteps);
    const approvalStatus = strategy.approval?.status ?? "NOT_SUBMITTED";
    const nextStatus = deriveStrategyStatus({
      archivedAt: strategy.archivedAt,
      approvalStatus,
      completionPercentage
    });

    const nextHistory = [
      ...strategy.history,
      buildHistoryEntry("STRATEGY_DRAFT_SAVED", `Etapa ${data.stepKey} salva`, authenticatedUserId, {
        stepKey: data.stepKey,
        saveMode: data.saveMode
      })
    ];

    const update = {
      draft: nextDraft,
      references: nextReferences,
      steps: nextSteps,
      completionPercentage,
      status: nextStatus,
      pendingChanges: data.hasUnsavedChanges ?? false,
      updatedBy: authenticatedUserId,
      history: nextHistory
    };

    if (data.saveMode === "AUTO") {
      update.lastAutoSavedAt = new Date();
    }

    await Strategy.updateOne({ _id: strategy.id }, { $set: update });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "STRATEGY_DRAFT_SAVED",
      targetType: "STRATEGY",
      targetId: strategy.id,
      context: {
        stepKey: data.stepKey,
        saveMode: data.saveMode,
        completionPercentage
      }
    });

    return {
      strategyId: strategy.id,
      stepKey: data.stepKey,
      completionPercentage,
      status: nextStatus,
      feedback: {
        type: data.saveMode === "AUTO" ? "AUTO_SAVE" : "MANUAL_SAVE",
        message: data.saveMode === "AUTO" ? "Draft salvo automaticamente" : "Draft salvo com sucesso"
      },
      lastAutoSavedAt: update.lastAutoSavedAt ?? strategy.lastAutoSavedAt,
      pendingChanges: update.pendingChanges
    };
  }

  async addComment(authenticatedUserId, strategyId, message) {
    const strategy = await findStrategyOrThrow(strategyId);
    const comment = {
      id: randomUUID(),
      authorUserId: authenticatedUserId,
      message: normalizeString(message),
      createdAt: new Date()
    };

    const nextComments = [...strategy.comments, comment];
    const nextHistory = [
      ...strategy.history,
      buildHistoryEntry("STRATEGY_COMMENT_ADDED", "Comentario adicionado a estrategia", authenticatedUserId, {
        commentId: comment.id
      })
    ];

    await Strategy.updateOne(
      { _id: strategy.id },
      {
        $set: {
          comments: nextComments,
          history: nextHistory,
          updatedBy: authenticatedUserId
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "STRATEGY_COMMENT_ADDED",
      targetType: "STRATEGY",
      targetId: strategy.id,
      context: {
        commentId: comment.id
      }
    });

    return toPublicComment(comment, await findUserSummary(authenticatedUserId));
  }

  async duplicate(authenticatedUserId, strategyId) {
    const strategy = await findStrategyOrThrow(strategyId);
    const duplicated = await Strategy.create({
      launchId: strategy.launchId,
      title: `${strategy.title} (Copia)`,
      product: strategy.product,
      expert: strategy.expert,
      responsibleUserId: strategy.responsibleUserId,
      status: strategy.status === "ARCHIVED" ? "DRAFT" : strategy.status,
      completionPercentage: strategy.completionPercentage,
      pendingChanges: true,
      lastAutoSavedAt: null,
      steps: strategy.steps.map((step) => ({
        ...step,
        lastSavedAt: null,
        completedAt: step.status === "COMPLETED" ? new Date() : null
      })),
      draft: strategy.draft,
      references: strategy.references,
      comments: [],
      history: [
        buildHistoryEntry("STRATEGY_DUPLICATED", "Estrategia duplicada para novo fluxo", authenticatedUserId, {
          sourceStrategyId: strategy.id
        })
      ],
      approval: {
        status: "NOT_SUBMITTED",
        submittedAt: null,
        submittedBy: null,
        decidedAt: null,
        decidedBy: null
      },
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "STRATEGY_DUPLICATED",
      targetType: "STRATEGY",
      targetId: duplicated.id,
      context: {
        sourceStrategyId: strategy.id
      }
    });

    return this.getById(duplicated.id, { code: "DIGITAL_STRATEGIST" });
  }

  async archive(authenticatedUserId, strategyId) {
    const strategy = await findStrategyOrThrow(strategyId);

    if (strategy.status === "ARCHIVED") {
      throw {
        statusCode: 409,
        message: "Strategy is already archived"
      };
    }

    const archivedAt = new Date();
    const nextHistory = [
      ...strategy.history,
      buildHistoryEntry("STRATEGY_ARCHIVED", "Estrategia arquivada", authenticatedUserId)
    ];

    await Strategy.updateOne(
      { _id: strategy.id },
      {
        $set: {
          status: "ARCHIVED",
          active: false,
          archivedAt,
          updatedBy: authenticatedUserId,
          history: nextHistory
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "STRATEGY_ARCHIVED",
      targetType: "STRATEGY",
      targetId: strategy.id,
      context: {
        archivedAt: archivedAt.toISOString()
      }
    });

    return {
      id: strategy.id,
      status: "ARCHIVED",
      archivedAt
    };
  }

  async submitForApproval(authenticatedUserId, strategyId) {
    const strategy = await findStrategyOrThrow(strategyId);

    if (strategy.status === "ARCHIVED") {
      throw {
        statusCode: 409,
        message: "Archived strategies cannot be submitted"
      };
    }

    if (strategy.completionPercentage < 75) {
      throw {
        statusCode: 409,
        message: "Strategy must be substantially complete before approval submission"
      };
    }

    const approval = {
      ...strategy.approval,
      status: "IN_REVIEW",
      submittedAt: new Date(),
      submittedBy: authenticatedUserId
    };
    const nextHistory = [
      ...strategy.history,
      buildHistoryEntry("STRATEGY_SUBMITTED_FOR_APPROVAL", "Estrategia enviada para aprovacao", authenticatedUserId, {
        completionPercentage: strategy.completionPercentage
      })
    ];

    await Strategy.updateOne(
      { _id: strategy.id },
      {
        $set: {
          approval,
          status: "IN_REVIEW",
          pendingChanges: false,
          updatedBy: authenticatedUserId,
          history: nextHistory
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "STRATEGY_SUBMITTED_FOR_APPROVAL",
      targetType: "STRATEGY",
      targetId: strategy.id,
      context: {
        completionPercentage: strategy.completionPercentage
      }
    });

    return {
      id: strategy.id,
      status: "IN_REVIEW",
      approval
    };
  }

  async generateAiContent(strategyId) {
    const strategy = await findStrategyOrThrow(strategyId);

    return {
      strategyId: strategy.id,
      generatedAt: new Date(),
      suggestions: createAiSuggestions(strategy)
    };
  }
}

export const strategyService = new StrategyService();
