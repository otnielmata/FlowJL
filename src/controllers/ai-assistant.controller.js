import { z } from "zod";

import { aiAssistantQuickActionTypes } from "../models/ai-assistant-conversation.model.js";
import { aiAssistantService } from "../services/ai-assistant.service.js";

const attachmentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  url: z.string().trim().url().optional(),
  mediaType: z.string().trim().min(2).max(120).optional(),
  sizeInBytes: z.number().int().min(0).optional()
});

const contextSchema = z.object({
  launchId: z.string().uuid().optional(),
  launchName: z.string().trim().min(2).max(120).optional(),
  product: z.string().trim().min(2).max(120).optional(),
  contentType: z.string().trim().min(2).max(50).optional(),
  channel: z.string().trim().min(2).max(50).optional(),
  reportType: z.string().trim().min(2).max(50).optional(),
  workflowStage: z.string().trim().min(2).max(50).optional(),
  objective: z.string().trim().min(3).max(180).optional()
});

const createConversationSchema = z.object({
  title: z.string().trim().min(3).max(140).optional(),
  initialPrompt: z.string().trim().min(3).max(4000),
  context: contextSchema,
  attachments: z.array(attachmentSchema).max(10).optional().default([])
});

const listQuerySchema = z.object({
  launchId: z.string().uuid().optional()
});

const conversationParamsSchema = z.object({
  conversationId: z.string().uuid()
});

const messageParamsSchema = z.object({
  messageId: z.string().uuid()
});

const sendMessageSchema = z.object({
  content: z.string().trim().min(3).max(4000),
  context: contextSchema.optional(),
  attachments: z.array(attachmentSchema).max(10).optional().default([])
});

const quickActionSchema = z.object({
  actionType: z.enum(aiAssistantQuickActionTypes),
  approverUserId: z.string().uuid().optional(),
  approverName: z.string().trim().min(3).max(120).optional()
});

class AiAssistantController {
  async createConversation(request, response) {
    const payload = createConversationSchema.parse(request.body);
    const conversation = await aiAssistantService.createConversation(request.auth.sub, payload);

    response.status(201).json(conversation);
  }

  async list(request, response) {
    const filters = listQuerySchema.parse(request.query);
    const conversations = await aiAssistantService.list(request.auth.sub, filters);

    response.status(200).json(conversations);
  }

  async getById(request, response) {
    const { conversationId } = conversationParamsSchema.parse(request.params);
    const conversation = await aiAssistantService.getById(conversationId);

    response.status(200).json(conversation);
  }

  async sendMessage(request, response) {
    const { conversationId } = conversationParamsSchema.parse(request.params);
    const payload = sendMessageSchema.parse(request.body);
    const conversation = await aiAssistantService.sendMessage(request.auth.sub, conversationId, payload);

    response.status(200).json(conversation);
  }

  async runQuickAction(request, response) {
    const { messageId } = messageParamsSchema.parse(request.params);
    const payload = quickActionSchema.parse(request.body);
    const result = await aiAssistantService.runQuickAction(request.auth.sub, messageId, payload);

    response.status(200).json(result);
  }
}

export const aiAssistantController = new AiAssistantController();
