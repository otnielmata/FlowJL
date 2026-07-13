import { z } from "zod";

import {
  aiTeamAutomationActionTypes,
  aiTeamAutomationContextTypes,
  aiTeamAutomationTriggerTypes
} from "../models/ai-team-automation.model.js";
import { aiTeamAutomationService } from "../services/ai-team-automation.service.js";

const triggerSchema = z.object({
  type: z.enum(aiTeamAutomationTriggerTypes),
  eventName: z.string().trim().min(3).max(120).nullable().optional(),
  scheduleExpression: z.string().trim().min(3).max(120).nullable().optional()
});

const ruleSchema = z.object({
  contextType: z.enum(aiTeamAutomationContextTypes),
  contextId: z.string().uuid().nullable().optional(),
  requiredPermission: z.string().trim().min(3).max(120),
  allowGlobalContext: z.boolean().optional().default(false),
  conditions: z.array(z.string().trim().min(3).max(240)).max(20).optional().default([])
});

const actionSchema = z.object({
  type: z.enum(aiTeamAutomationActionTypes),
  targetModule: z.string().trim().min(3).max(120),
  payloadTemplate: z.record(z.string(), z.unknown()).optional().default({}),
  secretConfig: z.record(z.string(), z.unknown()).nullable().optional()
});

const createTeamAutomationSchema = z.object({
  name: z.string().trim().min(3).max(160),
  description: z.string().trim().min(8).max(1000),
  trigger: triggerSchema,
  rule: ruleSchema,
  action: actionSchema,
  active: z.boolean().optional().default(false)
});

const paramsSchema = z.object({
  automationId: z.string().uuid()
});

const activeSchema = z.object({
  active: z.boolean()
});

const executeSchema = z.object({
  triggerPayload: z.record(z.string(), z.unknown()).optional().default({})
});

class AiTeamAutomationController {
  async create(request, response) {
    const payload = createTeamAutomationSchema.parse(request.body);
    const automation = await aiTeamAutomationService.create(request.auth.sub, payload);

    response.status(201).json(automation);
  }

  async getById(request, response) {
    const { automationId } = paramsSchema.parse(request.params);
    const automation = await aiTeamAutomationService.getById(automationId);

    response.status(200).json(automation);
  }

  async setActive(request, response) {
    const { automationId } = paramsSchema.parse(request.params);
    const payload = activeSchema.parse(request.body);
    const automation = await aiTeamAutomationService.setActive(request.auth.sub, automationId, payload.active);

    response.status(200).json(automation);
  }

  async execute(request, response) {
    const { automationId } = paramsSchema.parse(request.params);
    const payload = executeSchema.parse(request.body);
    const result = await aiTeamAutomationService.execute(request.auth.sub, automationId, payload.triggerPayload);

    response.status(200).json(result);
  }
}

export const aiTeamAutomationController = new AiTeamAutomationController();
