import { randomUUID } from "node:crypto";

import { AiAssistantConversation, aiAssistantQuickActionTypes } from "../models/ai-assistant-conversation.model.js";
import { Launch } from "../models/launch.model.js";
import { Permission } from "../models/permission.model.js";
import { Role } from "../models/role.model.js";
import { User } from "../models/user.model.js";
import { auditService } from "./audit.service.js";
import { contentProductionService } from "./content-production.service.js";
import { operationalScheduleService } from "./operational-schedule.service.js";

const quickActionPermissions = {
  COPY: [],
  SAVE_AS_CONTENT: ["CONTENT_PRODUCTION_CREATE"],
  SEND_FOR_APPROVAL: ["CONTENT_PRODUCTION_CREATE", "CONTENT_PRODUCTION_ACTION"],
  CREATE_TASK: ["OPERATIONAL_SCHEDULE_CREATE"]
};

const contentTypeToFormat = {
  REEL: "REEL",
  CAROUSEL: "CAROUSEL",
  STORIES: "STORIES",
  EMAIL: "EMAIL",
  YOUTUBE: "YOUTUBE",
  ADS: "ADS",
  LANDING_PAGE: "LANDING_PAGE"
};

const contentTypeToChannel = {
  REEL: "INSTAGRAM",
  CAROUSEL: "INSTAGRAM",
  STORIES: "INSTAGRAM",
  EMAIL: "EMAIL",
  YOUTUBE: "YOUTUBE",
  ADS: "META_ADS",
  LANDING_PAGE: "BLOG"
};

const contentTypeToArea = {
  REEL: "SOCIAL_MEDIA",
  CAROUSEL: "SOCIAL_MEDIA",
  STORIES: "SOCIAL_MEDIA",
  EMAIL: "CONTENT",
  YOUTUBE: "CONTENT",
  ADS: "TRAFFIC",
  LANDING_PAGE: "CONTENT"
};

function normalizeText(value) {
  return value?.trim() ?? null;
}

function normalizeAttachments(attachments = []) {
  return attachments.map((attachment) => ({
    id: attachment.id ?? randomUUID(),
    name: attachment.name.trim(),
    url: normalizeText(attachment.url),
    mediaType: normalizeText(attachment.mediaType),
    sizeInBytes: attachment.sizeInBytes ?? null
  }));
}

function normalizeContext(context = {}) {
  return {
    launchId: context.launchId ?? null,
    launchName: normalizeText(context.launchName),
    product: normalizeText(context.product),
    contentType: normalizeText(context.contentType)?.toUpperCase() ?? null,
    channel: normalizeText(context.channel)?.toUpperCase() ?? null,
    reportType: normalizeText(context.reportType)?.toUpperCase() ?? null,
    workflowStage: normalizeText(context.workflowStage)?.toUpperCase() ?? null,
    objective: normalizeText(context.objective)
  };
}

function buildSuggestedPrompts(context) {
  const prompts = [
    `Quais proximos passos devo seguir para ${context.objective ?? "avancar no fluxo"}?`,
    `Resuma um plano operacional para ${context.contentType ?? "o contexto atual"}.`,
    `Liste riscos, dependencias e revisoes humanas necessarias para esta entrega.`
  ];

  if (context.launchName) {
    prompts.unshift(`Monte uma resposta alinhada ao lancamento ${context.launchName}.`);
  }

  return [...new Set(prompts)];
}

function buildConversationTitle(context, initialPrompt) {
  const base =
    context.launchName ??
    context.product ??
    context.contentType ??
    initialPrompt.split(/\s+/).slice(0, 4).join(" ");

  return `Assistente IA | ${base}`;
}

function buildSources(context) {
  const sources = [];

  if (context.launchId || context.launchName || context.product) {
    sources.push({
      sourceType: "LAUNCH",
      sourceId: context.launchId ?? null,
      label: context.launchName ?? "Lancamento em contexto",
      detail: context.product ? `Produto: ${context.product}` : "Contexto operacional selecionado"
    });
  }

  if (context.contentType) {
    sources.push({
      sourceType: "CONTENT_TYPE",
      sourceId: context.contentType,
      label: `Formato ${context.contentType}`,
      detail: context.channel ? `Canal sugerido: ${context.channel}` : "Formato usado para orientar a resposta"
    });
  }

  if (context.reportType) {
    sources.push({
      sourceType: "REPORT",
      sourceId: context.reportType,
      label: `Relatorio ${context.reportType}`,
      detail: "Referencia contextual usada pela simulacao da IA"
    });
  }

  return sources;
}

function buildQuickActions(context) {
  const actions = ["COPY"];

  if (context.launchId && context.contentType) {
    actions.push("SAVE_AS_CONTENT", "SEND_FOR_APPROVAL");
  }

  if (context.launchId) {
    actions.push("CREATE_TASK");
  }

  return actions;
}

function buildAssistantContent(context, prompt) {
  const contextLine = [
    context.launchName ? `lancamento ${context.launchName}` : null,
    context.product ? `produto ${context.product}` : null,
    context.contentType ? `formato ${context.contentType}` : null,
    context.channel ? `canal ${context.channel}` : null,
    context.reportType ? `relatorio ${context.reportType}` : null
  ]
    .filter(Boolean)
    .join(", ");

  return [
    `Resposta contextual gerada para ${contextLine || "o fluxo atual"}.`,
    `Pedido analisado: ${prompt.trim()}.`,
    `Proposta: alinhar a resposta com o objetivo ${context.objective ?? "operacional informado"}, organizar proximos passos executaveis e preservar revisao humana antes de publicar ou aprovar.`,
    "Acoes sugeridas: revisar o texto, reaproveitar como conteudo ou criar uma tarefa operacional derivada."
  ].join(" ");
}

function toPublicConversation(conversation) {
  return {
    id: conversation.id,
    title: conversation.title,
    context: {
      launchId: conversation.context.launchId ?? null,
      launchName: conversation.context.launchName ?? null,
      product: conversation.context.product ?? null,
      contentType: conversation.context.contentType ?? null,
      channel: conversation.context.channel ?? null,
      reportType: conversation.context.reportType ?? null,
      workflowStage: conversation.context.workflowStage ?? null,
      objective: conversation.context.objective ?? null
    },
    suggestedPrompts: [...(conversation.suggestedPrompts ?? [])],
    messages: (conversation.messages ?? []).map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      attachments: (message.attachments ?? []).map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        url: attachment.url ?? null,
        mediaType: attachment.mediaType ?? null,
        sizeInBytes: attachment.sizeInBytes ?? null
      })),
      sources: (message.sources ?? []).map((source) => ({
        id: source.id,
        sourceType: source.sourceType,
        sourceId: source.sourceId ?? null,
        label: source.label,
        detail: source.detail ?? null
      })),
      availableQuickActions: [...(message.availableQuickActions ?? [])],
      generatedArtifacts: (message.generatedArtifacts ?? []).map((artifact) => ({
        id: artifact.id,
        actionType: artifact.actionType,
        resourceType: artifact.resourceType,
        resourceId: artifact.resourceId ?? null,
        summary: artifact.summary,
        createdAt: artifact.createdAt
      })),
      contextSnapshot: {
        launchId: message.contextSnapshot.launchId ?? null,
        launchName: message.contextSnapshot.launchName ?? null,
        product: message.contextSnapshot.product ?? null,
        contentType: message.contextSnapshot.contentType ?? null,
        channel: message.contextSnapshot.channel ?? null,
        reportType: message.contextSnapshot.reportType ?? null,
        workflowStage: message.contextSnapshot.workflowStage ?? null,
        objective: message.contextSnapshot.objective ?? null
      },
      humanReviewWarning: message.humanReviewWarning ?? null,
      createdAt: message.createdAt
    })),
    lastInteractionAt: conversation.lastInteractionAt,
    active: conversation.active,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    createdBy: conversation.createdBy ?? null,
    updatedBy: conversation.updatedBy ?? null
  };
}

async function ensureLaunchContext(context) {
  if (!context.launchId) {
    return context;
  }

  const launch = await Launch.findById(context.launchId);

  if (!launch || launch.active === false) {
    throw {
      statusCode: 404,
      message: "Launch not found"
    };
  }

  return {
    ...context,
    launchName: context.launchName ?? launch.name,
    product: context.product ?? launch.product
  };
}

async function ensureUserAndPermissions(authenticatedUserId, permissionCodes = []) {
  const user = await User.findById(authenticatedUserId);

  if (!user || user.status !== "ACTIVE") {
    throw {
      statusCode: 401,
      message: "Authenticated user not found"
    };
  }

  if (permissionCodes.length === 0) {
    return user;
  }

  const role = await Role.findOne({
    _id: user.roleId,
    active: true
  });

  if (!role) {
    throw {
      statusCode: 403,
      message: "Access denied"
    };
  }

  const permissions = await Permission.find({
    _id: {
      $in: role.permissionIds
    },
    code: {
      $in: permissionCodes
    },
    active: true
  });

  const grantedCodes = new Set(permissions.map((permission) => permission.code));

  if (!permissionCodes.every((permissionCode) => grantedCodes.has(permissionCode))) {
    throw {
      statusCode: 403,
      message: "Access denied"
    };
  }

  return user;
}

function buildUserMessage(content, contextSnapshot, attachments = []) {
  return {
    id: randomUUID(),
    role: "USER",
    content: content.trim(),
    attachments: normalizeAttachments(attachments),
    sources: [],
    availableQuickActions: [],
    generatedArtifacts: [],
    contextSnapshot,
    humanReviewWarning: null,
    createdAt: new Date()
  };
}

function buildAssistantMessage(contextSnapshot, prompt) {
  return {
    id: randomUUID(),
    role: "ASSISTANT",
    content: buildAssistantContent(contextSnapshot, prompt),
    attachments: [],
    sources: buildSources(contextSnapshot),
    availableQuickActions: buildQuickActions(contextSnapshot),
    generatedArtifacts: [],
    contextSnapshot,
    humanReviewWarning: "Conteudo gerado por IA. Revise com validacao humana antes de publicar, aprovar ou executar mudancas operacionais.",
    createdAt: new Date()
  };
}

function getDerivedContentFormat(context) {
  return context.contentType && contentTypeToFormat[context.contentType] ? contentTypeToFormat[context.contentType] : "REEL";
}

function getDerivedChannel(context) {
  if (context.channel) {
    return context.channel;
  }

  return context.contentType && contentTypeToChannel[context.contentType] ? contentTypeToChannel[context.contentType] : "INSTAGRAM";
}

function buildContentTitle(message, context) {
  const base = message.content.split(".")[0] ?? "Conteudo derivado da IA";
  const prefix = context.contentType ? `${context.contentType} | ` : "";
  return `${prefix}${base}`.slice(0, 120);
}

function findMessageOrThrow(conversation, messageId) {
  const message = (conversation.messages ?? []).find((item) => item.id === messageId);

  if (!message) {
    throw {
      statusCode: 404,
      message: "Assistant message not found"
    };
  }

  if (message.role !== "ASSISTANT") {
    throw {
      statusCode: 409,
      message: "Quick actions are only available for assistant messages"
    };
  }

  return message;
}

function buildConversationSummary(conversation) {
  const lastMessage = conversation.messages?.at(-1) ?? null;

  return {
    id: conversation.id,
    title: conversation.title,
    context: {
      launchId: conversation.context.launchId ?? null,
      launchName: conversation.context.launchName ?? null,
      product: conversation.context.product ?? null,
      contentType: conversation.context.contentType ?? null,
      channel: conversation.context.channel ?? null,
      reportType: conversation.context.reportType ?? null,
      workflowStage: conversation.context.workflowStage ?? null,
      objective: conversation.context.objective ?? null
    },
    suggestedPrompts: [...(conversation.suggestedPrompts ?? [])],
    messageCount: conversation.messages?.length ?? 0,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          role: lastMessage.role,
          preview: lastMessage.content.slice(0, 180),
          createdAt: lastMessage.createdAt
        }
      : null,
    lastInteractionAt: conversation.lastInteractionAt,
    updatedAt: conversation.updatedAt
  };
}

class AiAssistantService {
  async createConversation(authenticatedUserId, data) {
    const baseContext = await ensureLaunchContext(normalizeContext(data.context));
    const initialPrompt = data.initialPrompt.trim();
    const userMessage = buildUserMessage(initialPrompt, baseContext, data.attachments);
    const assistantMessage = buildAssistantMessage(baseContext, initialPrompt);
    const conversation = await AiAssistantConversation.create({
      title: normalizeText(data.title) ?? buildConversationTitle(baseContext, initialPrompt),
      context: baseContext,
      suggestedPrompts: buildSuggestedPrompts(baseContext),
      messages: [userMessage, assistantMessage],
      lastInteractionAt: assistantMessage.createdAt,
      active: true,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AI_ASSISTANT_CONVERSATION_CREATED",
      targetType: "AI_ASSISTANT_CONVERSATION",
      targetId: conversation.id,
      context: {
        launchId: baseContext.launchId,
        contentType: baseContext.contentType,
        reportType: baseContext.reportType
      }
    });

    return toPublicConversation(conversation);
  }

  async list(authenticatedUserId, filters = {}) {
    const query = {
      active: true
    };

    if (filters.launchId) {
      query["context.launchId"] = filters.launchId;
    }

    const conversations = await AiAssistantConversation.find(query).sort({ lastInteractionAt: -1, updatedAt: -1 });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AI_ASSISTANT_CONVERSATIONS_LISTED",
      targetType: "AI_ASSISTANT_CONVERSATION",
      targetId: filters.launchId ?? "GLOBAL",
      context: {
        launchId: filters.launchId ?? null,
        results: conversations.length
      }
    });

    return conversations.map(buildConversationSummary);
  }

  async getById(conversationId) {
    const conversation = await AiAssistantConversation.findById(conversationId);

    if (!conversation || conversation.active === false) {
      throw {
        statusCode: 404,
        message: "AI assistant conversation not found"
      };
    }

    return toPublicConversation(conversation);
  }

  async sendMessage(authenticatedUserId, conversationId, data) {
    const conversation = await AiAssistantConversation.findById(conversationId);

    if (!conversation || conversation.active === false) {
      throw {
        statusCode: 404,
        message: "AI assistant conversation not found"
      };
    }

    const mergedContext = await ensureLaunchContext({
      ...normalizeContext(conversation.context),
      ...normalizeContext(data.context ?? {}),
      launchId: data.context?.launchId ?? conversation.context.launchId ?? null
    });
    const userMessage = buildUserMessage(data.content, mergedContext, data.attachments);
    const assistantMessage = buildAssistantMessage(mergedContext, data.content);
    const nextMessages = [...conversation.messages, userMessage, assistantMessage];

    await AiAssistantConversation.updateOne(
      { _id: conversationId },
      {
        $set: {
          context: mergedContext,
          suggestedPrompts: buildSuggestedPrompts(mergedContext),
          messages: nextMessages,
          lastInteractionAt: assistantMessage.createdAt,
          updatedBy: authenticatedUserId
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AI_ASSISTANT_MESSAGE_SENT",
      targetType: "AI_ASSISTANT_CONVERSATION",
      targetId: conversation.id,
      context: {
        launchId: mergedContext.launchId,
        messageCount: nextMessages.length
      }
    });

    return toPublicConversation({
      ...conversation.toObject(),
      context: mergedContext,
      suggestedPrompts: buildSuggestedPrompts(mergedContext),
      messages: nextMessages,
      lastInteractionAt: assistantMessage.createdAt,
      updatedAt: new Date(),
      updatedBy: authenticatedUserId
    });
  }

  async runQuickAction(authenticatedUserId, messageId, data) {
    const actionType = data.actionType.trim().toUpperCase();

    if (!aiAssistantQuickActionTypes.includes(actionType)) {
      throw {
        statusCode: 400,
        message: "Unsupported AI assistant quick action"
      };
    }

    const conversation = await AiAssistantConversation.findOne({ "messages.id": messageId, active: true });

    if (!conversation) {
      throw {
        statusCode: 404,
        message: "AI assistant conversation not found"
      };
    }

    const message = findMessageOrThrow(conversation, messageId);

    if (!(message.availableQuickActions ?? []).includes(actionType)) {
      throw {
        statusCode: 409,
        message: "Quick action is not available for the selected context"
      };
    }

    const currentUser = await ensureUserAndPermissions(authenticatedUserId, quickActionPermissions[actionType]);
    let artifact = null;
    let actionResult = null;

    if (actionType === "COPY") {
      actionResult = {
        actionType,
        copiedText: message.content,
        humanReviewWarning: message.humanReviewWarning
      };
      artifact = {
        id: randomUUID(),
        actionType,
        resourceType: "CLIPBOARD",
        resourceId: null,
        summary: "Resposta preparada para reutilizacao manual.",
        createdAt: new Date()
      };
    }

    if (actionType === "SAVE_AS_CONTENT" || actionType === "SEND_FOR_APPROVAL") {
      const content = await contentProductionService.create(authenticatedUserId, {
        launchId: message.contextSnapshot.launchId,
        title: buildContentTitle(message, message.contextSnapshot),
        summary: message.content.slice(0, 140),
        body: message.content,
        objective: message.contextSnapshot.objective ?? "Reaproveitar resposta do assistente",
        format: getDerivedContentFormat(message.contextSnapshot),
        channel: getDerivedChannel(message.contextSnapshot),
        responsible: currentUser.name,
        status: "DRAFT",
        attachments: message.attachments ?? [],
        references: (message.sources ?? []).map((source) => ({
          label: source.label,
          url: source.sourceId ? `flow-jl://${source.sourceType}/${source.sourceId}` : `flow-jl://${source.sourceType}`
        })),
        actorName: currentUser.name
      });

      let contentResult = content;

      if (actionType === "SEND_FOR_APPROVAL") {
        contentResult = await contentProductionService.runAction(authenticatedUserId, content.id, {
          actionType: "SEND_APPROVAL",
          approverUserId: data.approverUserId ?? null,
          approverName: normalizeText(data.approverName) ?? "Aprovador pendente",
          actorName: currentUser.name
        });
      }

      actionResult = {
        actionType,
        content: {
          id: contentResult.id,
          title: contentResult.title,
          status: contentResult.status,
          channel: contentResult.channel,
          format: contentResult.format
        },
        humanReviewWarning: message.humanReviewWarning
      };
      artifact = {
        id: randomUUID(),
        actionType,
        resourceType: "CONTENT_PRODUCTION",
        resourceId: contentResult.id,
        summary:
          actionType === "SEND_FOR_APPROVAL"
            ? "Resposta reaproveitada como conteudo e enviada para aprovacao."
            : "Resposta reaproveitada como conteudo rascunho.",
        createdAt: new Date()
      };
    }

    if (actionType === "CREATE_TASK") {
      if (!message.contextSnapshot.launchId) {
        throw {
          statusCode: 400,
          message: "Operational task creation requires a launch context"
        };
      }

      const now = new Date();
      const dueAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const task = await operationalScheduleService.create(authenticatedUserId, {
        launchId: message.contextSnapshot.launchId,
        title: `Acao derivada da IA | ${buildContentTitle(message, message.contextSnapshot)}`,
        description: message.content,
        area: contentTypeToArea[message.contextSnapshot.contentType] ?? "OPERATIONS",
        priority: "MEDIUM",
        status: "BACKLOG",
        type: "TASK",
        responsible: currentUser.name,
        startsAt: now.toISOString(),
        dueAt: dueAt.toISOString(),
        dependencyIds: [],
        checklist: [],
        attachments: [],
        comments: [],
        tags: ["AI_ASSISTANT", ...(message.contextSnapshot.contentType ? [message.contextSnapshot.contentType] : [])],
        recurrence: {
          frequency: "NONE"
        },
        reminder: {
          enabled: false
        },
        relationships: {},
        timelinePosition: 0
      });

      actionResult = {
        actionType,
        task: {
          id: task.id,
          title: task.title,
          status: task.status,
          dueAt: task.dueAt
        },
        humanReviewWarning: message.humanReviewWarning
      };
      artifact = {
        id: randomUUID(),
        actionType,
        resourceType: "OPERATIONAL_SCHEDULE",
        resourceId: task.id,
        summary: "Resposta convertida em tarefa operacional rastreavel.",
        createdAt: new Date()
      };
    }

    const nextMessages = conversation.messages.map((conversationMessage) =>
      conversationMessage.id === messageId
        ? {
            ...conversationMessage,
            generatedArtifacts: [...(conversationMessage.generatedArtifacts ?? []), artifact]
          }
        : conversationMessage
    );

    await AiAssistantConversation.updateOne(
      { _id: conversation.id },
      {
        $set: {
          messages: nextMessages,
          lastInteractionAt: artifact.createdAt,
          updatedBy: authenticatedUserId
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "AI_ASSISTANT_QUICK_ACTION_EXECUTED",
      targetType: "AI_ASSISTANT_CONVERSATION",
      targetId: conversation.id,
      context: {
        actionType,
        launchId: message.contextSnapshot.launchId ?? null,
        messageId
      }
    });

    return {
      conversationId: conversation.id,
      messageId,
      actionResult,
      generatedArtifact: artifact
    };
  }
}

export const aiAssistantService = new AiAssistantService();
