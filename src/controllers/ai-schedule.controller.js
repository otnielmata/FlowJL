import { z } from "zod";

import { aiScheduleReviewStatuses } from "../models/ai-schedule.model.js";
import { aiScheduleService } from "../services/ai-schedule.service.js";

const paramsSchema = z.object({
  launchId: z.string().uuid()
});

const scheduleParamsSchema = z.object({
  scheduleId: z.string().uuid()
});

const generateAiScheduleSchema = z.object({
  objective: z.string().trim().min(8).max(180),
  briefing: z.string().trim().min(30).max(5000)
});

const activitySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(180),
  stage: z.string().trim().min(3).max(120),
  area: z.string().trim().min(2).max(120),
  suggestedResponsibleRole: z.string().trim().min(2).max(80),
  dueAt: z.coerce.date(),
  dependencies: z.array(z.string().trim().min(2).max(160)).max(20).optional().default([]),
  reviewNotes: z.array(z.string().trim().min(3).max(240)).max(10).optional().default([])
});

const phaseSchema = z.object({
  name: z.string().trim().min(3).max(120),
  objective: z.string().trim().min(8).max(300),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  activities: z.array(activitySchema).min(1).max(40)
});

const saveAiScheduleSchema = z.object({
  launchId: z.string().uuid(),
  objective: z.string().trim().min(8).max(180),
  briefing: z.string().trim().min(30).max(5000),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  phases: z.array(phaseSchema).min(1).max(8),
  reviewNotes: z.array(z.string().trim().min(3).max(240)).max(20).optional().default([]),
  sourceContext: z.object({
    launchId: z.string().uuid(),
    launchName: z.string().trim().min(3).max(180),
    product: z.string().trim().min(2).max(180),
    expert: z.string().trim().min(2).max(180),
    contentPlanVersion: z.number().int().nullable(),
    smartScheduleVersion: z.number().int().nullable(),
    internalSignals: z.record(z.string(), z.number().int().nonnegative())
  })
});

const listAiScheduleSchema = z.object({
  launchId: z.string().uuid().optional(),
  reviewStatus: z.enum(aiScheduleReviewStatuses).optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional()
});

class AiScheduleController {
  async generate(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = generateAiScheduleSchema.parse(request.body);
    const scheduleSuggestion = await aiScheduleService.generate(request.auth.sub, launchId, payload);

    response.status(200).json(scheduleSuggestion);
  }

  async create(request, response) {
    const payload = saveAiScheduleSchema.parse(request.body);
    const schedule = await aiScheduleService.create(request.auth.sub, payload);

    response.status(201).json(schedule);
  }

  async list(request, response) {
    const filters = listAiScheduleSchema.parse(request.query);
    const schedules = await aiScheduleService.list(filters);

    response.status(200).json(schedules);
  }

  async getById(request, response) {
    const { scheduleId } = scheduleParamsSchema.parse(request.params);
    const schedule = await aiScheduleService.getById(scheduleId);

    response.status(200).json(schedule);
  }
}

export const aiScheduleController = new AiScheduleController();
