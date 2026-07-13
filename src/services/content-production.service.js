import { randomUUID } from "node:crypto";

import { ContentProduction, contentProductionStatuses } from "../models/content-production.model.js";
import { Launch } from "../models/launch.model.js";
import { auditService } from "./audit.service.js";

const statusFlow = {
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["SCHEDULED", "PUBLISHED"],
  REJECTED: ["DRAFT", "IN_REVIEW"],
  SCHEDULED: ["PUBLISHED"],
  PUBLISHED: []
};

function normalizeDate(value) {
  return value ? new Date(value) : null;
}

function normalizeString(value) {
  return value?.trim() ?? null;
}

function normalizeUniqueArray(values = []) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeAttachments(attachments = []) {
  return attachments.map((attachment) => ({
    id: attachment.id ?? randomUUID(),
    name: attachment.name.trim(),
    url: attachment.url.trim(),
    mediaType: normalizeString(attachment.mediaType)
  }));
}

function normalizeReferences(references = []) {
  return references.map((reference) => ({
    id: reference.id ?? randomUUID(),
    label: reference.label.trim(),
    url: reference.url.trim()
  }));
}

function buildVersion(data, actorUserId, version, overrides = {}) {
  return {
    id: randomUUID(),
    version,
    title: data.title.trim(),
    summary: normalizeString(data.summary),
    body: data.body.trim(),
    channel: data.channel,
    format: data.format,
    aiActionType: overrides.aiActionType ?? null,
    comparisonBaseVersion: overrides.comparisonBaseVersion ?? null,
    diffSummary: overrides.diffSummary ?? null,
    createdBy: actorUserId,
    createdAt: new Date()
  };
}

function getCurrentVersion(content) {
  return content.versions.find((version) => version.version === content.currentVersion) ?? content.versions[content.versions.length - 1];
}

function computeDiffSummary(previousVersion, nextVersion) {
  if (!previousVersion) {
    return "Versao inicial criada.";
  }

  const changes = [];

  if (previousVersion.title !== nextVersion.title) {
    changes.push("titulo ajustado");
  }

  if (previousVersion.summary !== nextVersion.summary) {
    changes.push("resumo ajustado");
  }

  if (previousVersion.body !== nextVersion.body) {
    changes.push("corpo revisado");
  }

  if (previousVersion.channel !== nextVersion.channel) {
    changes.push("canal adaptado");
  }

  if (previousVersion.format !== nextVersion.format) {
    changes.push("formato ajustado");
  }

  return changes.length > 0 ? `Mudancas: ${changes.join(", ")}.` : "Sem alteracoes textuais relevantes.";
}

function buildHistoryEntry(actionType, actorUserId, actorName, message, metadata = {}) {
  return {
    id: randomUUID(),
    actionType,
    actorUserId,
    actorName: actorName.trim(),
    message,
    metadata,
    createdAt: new Date()
  };
}

function buildPublication(data, currentPublication) {
  if (!data.publication) {
    return currentPublication;
  }

  const publishAt = data.publication.publishAt !== undefined ? normalizeDate(data.publication.publishAt) : currentPublication.publishAt ?? null;
  const publishedAt = data.publication.publishedAt !== undefined ? normalizeDate(data.publication.publishedAt) : currentPublication.publishedAt ?? null;
  const status = data.publication.status ?? currentPublication.status;

  return {
    publishAt,
    publishedAt,
    status
  };
}

function normalizeStatusTransition(fromStatus, toStatus) {
  if (!toStatus || fromStatus === toStatus) {
    return fromStatus;
  }

  if (!contentProductionStatuses.includes(toStatus)) {
    throw {
      statusCode: 400,
      message: "Unsupported content production status"
    };
  }

  if (!(statusFlow[fromStatus] ?? []).includes(toStatus)) {
    throw {
      statusCode: 409,
      message: "Invalid content production status transition"
    };
  }

  return toStatus;
}

function buildComparison(content, targetVersion = null) {
  const currentVersion = getCurrentVersion(content);
  const previousVersion =
    targetVersion !== null
      ? content.versions.find((version) => version.version === targetVersion) ?? null
      : content.versions.find((version) => version.version === currentVersion.version - 1) ?? null;

  return {
    current: currentVersion
      ? {
          version: currentVersion.version,
          title: currentVersion.title,
          summary: currentVersion.summary ?? null,
          body: currentVersion.body,
          channel: currentVersion.channel,
          format: currentVersion.format,
          diffSummary: currentVersion.diffSummary ?? null
        }
      : null,
    previous: previousVersion
      ? {
          version: previousVersion.version,
          title: previousVersion.title,
          summary: previousVersion.summary ?? null,
          body: previousVersion.body,
          channel: previousVersion.channel,
          format: previousVersion.format
        }
      : null
  };
}

function toPublicVersion(version) {
  return {
    id: version.id,
    version: version.version,
    title: version.title,
    summary: version.summary ?? null,
    body: version.body,
    channel: version.channel,
    format: version.format,
    aiActionType: version.aiActionType ?? null,
    comparisonBaseVersion: version.comparisonBaseVersion ?? null,
    diffSummary: version.diffSummary ?? null,
    createdBy: version.createdBy,
    createdAt: version.createdAt
  };
}

function toPublicContentProduction(content) {
  const currentVersion = getCurrentVersion(content);

  return {
    id: content.id,
    launchId: content.launchId,
    title: currentVersion?.title ?? null,
    format: content.format,
    channel: content.channel,
    objective: content.objective,
    responsible: content.responsible,
    publication: {
      publishAt: content.publication?.publishAt ?? null,
      publishedAt: content.publication?.publishedAt ?? null,
      status: content.publication?.status ?? "NOT_SCHEDULED"
    },
    status: content.currentStatus,
    launch: {
      id: content.launchId
    },
    approver: {
      status: content.approval?.status ?? "NOT_SENT",
      userId: content.approval?.approverUserId ?? null,
      name: content.approval?.approverName ?? null,
      rejectionReason: content.approval?.rejectionReason ?? null
    },
    attachments: (content.attachments ?? []).map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      url: attachment.url,
      mediaType: attachment.mediaType ?? null
    })),
    references: (content.references ?? []).map((reference) => ({
      id: reference.id,
      label: reference.label,
      url: reference.url
    })),
    currentVersion: content.currentVersion,
    versions: (content.versions ?? []).map(toPublicVersion),
    comparison: buildComparison(content),
    history: (content.history ?? []).map((entry) => ({
      id: entry.id,
      actionType: entry.actionType,
      actorUserId: entry.actorUserId,
      actorName: entry.actorName,
      message: entry.message,
      metadata: entry.metadata ?? {},
      createdAt: entry.createdAt
    })),
    active: content.active,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
    createdBy: content.createdBy ?? null,
    updatedBy: content.updatedBy ?? null
  };
}

async function ensureLaunchExists(launchId) {
  const launch = await Launch.findById(launchId);

  if (!launch || launch.active === false) {
    throw {
      statusCode: 404,
      message: "Launch not found"
    };
  }

  return launch;
}

function ensureRequiredFields(data) {
  if (!data.title.trim() || !data.body.trim() || !data.objective.trim() || !data.responsible.trim()) {
    throw {
      statusCode: 400,
      message: "Content production requires title, body, objective and responsible"
    };
  }
}

function generateAiVersion(currentVersion, actionType, data) {
  switch (actionType) {
    case "REWRITE":
      return {
        title: currentVersion.title,
        summary: currentVersion.summary,
        body: `${currentVersion.body}\n\nVersao reescrita para melhorar clareza, ritmo e chamada para acao.`,
        channel: currentVersion.channel,
        format: currentVersion.format
      };
    case "SUMMARIZE":
      return {
        title: `${currentVersion.title} | Resumo`,
        summary: currentVersion.body.slice(0, 140),
        body: currentVersion.body.slice(0, 240),
        channel: currentVersion.channel,
        format: currentVersion.format
      };
    case "VARIATION":
      return {
        title: `${currentVersion.title} | Variacao`,
        summary: currentVersion.summary,
        body: `${currentVersion.body}\n\nNova variacao com angulo alternativo e enfatise diferente de beneficio.`,
        channel: currentVersion.channel,
        format: currentVersion.format
      };
    case "ADAPT_CHANNEL":
      return {
        title: currentVersion.title,
        summary: currentVersion.summary,
        body: `${currentVersion.body}\n\nAdaptado para o canal ${data.targetChannel}.`,
        channel: data.targetChannel,
        format: currentVersion.format
      };
    default:
      throw {
        statusCode: 400,
        message: "Unsupported AI action"
      };
  }
}

class ContentProductionService {
  async create(authenticatedUserId, data) {
    ensureRequiredFields(data);
    await ensureLaunchExists(data.launchId);

    const initialVersion = buildVersion(data, authenticatedUserId, 1);
    initialVersion.diffSummary = "Versao inicial criada.";

    const content = await ContentProduction.create({
      launchId: data.launchId,
      objective: data.objective.trim(),
      format: data.format,
      channel: data.channel,
      responsible: data.responsible.trim(),
      currentStatus: data.status,
      versions: [initialVersion],
      currentVersion: 1,
      attachments: normalizeAttachments(data.attachments),
      references: normalizeReferences(data.references),
      publication: {
        publishAt: normalizeDate(data.publication?.publishAt),
        publishedAt: normalizeDate(data.publication?.publishedAt),
        status: data.publication?.status ?? "NOT_SCHEDULED"
      },
      approval: {
        status: "NOT_SENT"
      },
      history: [
        buildHistoryEntry("CREATED", authenticatedUserId, data.actorName, "Conteudo criado.", {
          version: 1,
          status: data.status
        })
      ],
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "CONTENT_PRODUCTION_CREATED",
      targetType: "CONTENT_PRODUCTION",
      targetId: content.id,
      context: {
        launchId: content.launchId,
        format: content.format,
        channel: content.channel,
        status: content.currentStatus
      }
    });

    return toPublicContentProduction(content);
  }

  async list(filters = {}) {
    const query = {
      active: true
    };

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.format) {
      query.format = filters.format;
    }

    if (filters.channel) {
      query.channel = filters.channel;
    }

    if (filters.status) {
      query.currentStatus = filters.status;
    }

    const contents = await ContentProduction.find(query).sort({
      "publication.publishAt": 1,
      updatedAt: -1,
      createdAt: -1
    });

    return contents.map((content) => {
      const publicContent = toPublicContentProduction(content);

      return {
        id: publicContent.id,
        title: publicContent.title,
        format: publicContent.format,
        channel: publicContent.channel,
        objective: publicContent.objective,
        responsible: publicContent.responsible,
        publication: publicContent.publication,
        status: publicContent.status,
        launch: publicContent.launch,
        approver: publicContent.approver,
        currentVersion: publicContent.currentVersion,
        updatedAt: publicContent.updatedAt
      };
    });
  }

  async getById(contentId) {
    const content = await ContentProduction.findById(contentId);

    if (!content || !content.active) {
      throw {
        statusCode: 404,
        message: "Content production not found"
      };
    }

    return toPublicContentProduction(content);
  }

  async update(authenticatedUserId, contentId, data) {
    const content = await ContentProduction.findById(contentId);

    if (!content || !content.active) {
      throw {
        statusCode: 404,
        message: "Content production not found"
      };
    }

    const currentVersion = getCurrentVersion(content);
    const nextStatus = data.status ? normalizeStatusTransition(content.currentStatus, data.status) : content.currentStatus;
    const contentFieldsChanged =
      (data.title && data.title.trim() !== currentVersion.title) ||
      (data.summary !== undefined && normalizeString(data.summary) !== (currentVersion.summary ?? null)) ||
      (data.body && data.body.trim() !== currentVersion.body) ||
      (data.channel && data.channel !== currentVersion.channel) ||
      (data.format && data.format !== currentVersion.format);

    let versions = content.versions;
    let currentVersionNumber = content.currentVersion;

    if (contentFieldsChanged) {
      const nextVersionData = {
        title: data.title ?? currentVersion.title,
        summary: data.summary !== undefined ? data.summary : currentVersion.summary,
        body: data.body ?? currentVersion.body,
        channel: data.channel ?? currentVersion.channel,
        format: data.format ?? currentVersion.format
      };
      const nextVersion = buildVersion(nextVersionData, authenticatedUserId, content.currentVersion + 1, {
        comparisonBaseVersion: currentVersion.version
      });
      nextVersion.diffSummary = computeDiffSummary(currentVersion, nextVersion);
      versions = [...content.versions, nextVersion];
      currentVersionNumber = nextVersion.version;
    }

    const attachments = data.attachments ? normalizeAttachments(data.attachments) : content.attachments;
    const references = data.references ? normalizeReferences(data.references) : content.references;
    const publication = buildPublication(data, content.publication ?? { status: "NOT_SCHEDULED", publishAt: null, publishedAt: null });
    const history = [
      ...(content.history ?? []),
      buildHistoryEntry("UPDATED", authenticatedUserId, data.actorName, "Conteudo atualizado.", {
        status: nextStatus,
        version: currentVersionNumber
      })
    ];

    const approval =
      content.currentStatus === "REJECTED" && nextStatus === "DRAFT"
        ? {
            ...content.approval,
            status: "NOT_SENT",
            rejectionReason: null
          }
        : content.approval;

    const updates = {
      objective: data.objective?.trim() ?? content.objective,
      format: data.format ?? content.format,
      channel: data.channel ?? content.channel,
      responsible: data.responsible?.trim() ?? content.responsible,
      currentStatus: nextStatus,
      versions,
      currentVersion: currentVersionNumber,
      attachments,
      references,
      publication,
      approval,
      history,
      updatedBy: authenticatedUserId
    };

    await ContentProduction.updateOne(
      { _id: contentId },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "CONTENT_PRODUCTION_UPDATED",
      targetType: "CONTENT_PRODUCTION",
      targetId: content.id,
      context: {
        launchId: content.launchId,
        previousStatus: content.currentStatus,
        status: nextStatus,
        version: currentVersionNumber
      }
    });

    return toPublicContentProduction({
      ...content.toObject(),
      ...updates,
      id: content.id,
      updatedAt: new Date()
    });
  }

  async runAction(authenticatedUserId, contentId, data) {
    const content = await ContentProduction.findById(contentId);

    if (!content || !content.active) {
      throw {
        statusCode: 404,
        message: "Content production not found"
      };
    }

    const currentVersion = getCurrentVersion(content);

    if (["SEND_APPROVAL", "APPROVE", "REJECT"].includes(data.actionType)) {
      return this.#handleApprovalAction(authenticatedUserId, content, data);
    }

    const generated = generateAiVersion(currentVersion, data.actionType, data);
    const nextVersion = buildVersion(generated, authenticatedUserId, content.currentVersion + 1, {
      aiActionType: data.actionType,
      comparisonBaseVersion: currentVersion.version
    });
    nextVersion.diffSummary = computeDiffSummary(currentVersion, nextVersion);

    const history = [
      ...(content.history ?? []),
      buildHistoryEntry(data.actionType, authenticatedUserId, data.actorName, "Acao de IA registrada com nova versao para comparacao.", {
        version: nextVersion.version,
        baseVersion: currentVersion.version,
        targetChannel: data.targetChannel ?? null
      })
    ];

    const updates = {
      channel: generated.channel,
      format: generated.format,
      versions: [...content.versions, nextVersion],
      currentVersion: nextVersion.version,
      history,
      updatedBy: authenticatedUserId
    };

    await ContentProduction.updateOne(
      { _id: content.id },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "CONTENT_PRODUCTION_AI_ACTION",
      targetType: "CONTENT_PRODUCTION",
      targetId: content.id,
      context: {
        launchId: content.launchId,
        actionType: data.actionType,
        version: nextVersion.version
      }
    });

    return toPublicContentProduction({
      ...content.toObject(),
      ...updates,
      id: content.id,
      updatedAt: new Date()
    });
  }

  async #handleApprovalAction(authenticatedUserId, content, data) {
    const history = [...(content.history ?? [])];
    let nextStatus = content.currentStatus;
    let approval = { ...(content.approval ?? { status: "NOT_SENT" }) };

    if (data.actionType === "SEND_APPROVAL") {
      nextStatus = normalizeStatusTransition(content.currentStatus, "IN_REVIEW");
      approval = {
        ...approval,
        status: "PENDING",
        approverUserId: data.approverUserId ?? null,
        approverName: normalizeString(data.approverName),
        requestedBy: authenticatedUserId,
        requestedAt: new Date(),
        rejectionReason: null
      };
      history.push(
        buildHistoryEntry("SEND_APPROVAL", authenticatedUserId, data.actorName, "Conteudo enviado para aprovacao.", {
          approverName: approval.approverName ?? null
        })
      );
    }

    if (data.actionType === "APPROVE") {
      nextStatus = normalizeStatusTransition(content.currentStatus, "APPROVED");
      approval = {
        ...approval,
        status: "APPROVED",
        respondedBy: authenticatedUserId,
        respondedAt: new Date(),
        rejectionReason: null
      };
      history.push(buildHistoryEntry("APPROVE", authenticatedUserId, data.actorName, "Conteudo aprovado.", {}));
    }

    if (data.actionType === "REJECT") {
      if (!data.reason?.trim()) {
        throw {
          statusCode: 400,
          message: "Rejected content requires a reason"
        };
      }

      nextStatus = normalizeStatusTransition(content.currentStatus, "REJECTED");
      approval = {
        ...approval,
        status: "REJECTED",
        respondedBy: authenticatedUserId,
        respondedAt: new Date(),
        rejectionReason: data.reason.trim()
      };
      history.push(
        buildHistoryEntry("REJECT", authenticatedUserId, data.actorName, "Conteudo reprovado com motivo registrado.", {
          reason: data.reason.trim()
        })
      );
    }

    const updates = {
      currentStatus: nextStatus,
      approval,
      history,
      updatedBy: authenticatedUserId
    };

    await ContentProduction.updateOne(
      { _id: content.id },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "CONTENT_PRODUCTION_APPROVAL_ACTION",
      targetType: "CONTENT_PRODUCTION",
      targetId: content.id,
      context: {
        launchId: content.launchId,
        actionType: data.actionType,
        status: nextStatus
      }
    });

    return toPublicContentProduction({
      ...content.toObject(),
      ...updates,
      id: content.id,
      updatedAt: new Date()
    });
  }
}

export const contentProductionService = new ContentProductionService();
