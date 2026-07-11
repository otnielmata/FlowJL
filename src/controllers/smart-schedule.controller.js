import { z } from "zod";

import { smartScheduleService } from "../services/smart-schedule.service.js";

const paramsSchema = z.object({
  launchId: z.string().uuid()
});

const createSmartScheduleSchema = z.object({
  objective: z.string().trim().min(3).max(200),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  operationalCadenceDays: z.number().int().min(1).max(30).optional()
});

const updateActivitySchema = z.object({
  theme: z.string().trim().min(3).max(200),
  objective: z.string().trim().min(3).max(200),
  stage: z.string().trim().min(3).max(120),
  deliveryType: z.string().trim().min(3).max(120),
  area: z.string().trim().min(3).max(120),
  suggestedResponsibleRole: z.string().trim().min(3).max(120),
  dueAt: z.string().datetime(),
  status: z.string().trim().min(3).max(80)
});

const updateSmartScheduleSchema = z.object({
  objective: z.string().trim().min(3).max(200),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  operationalCadenceDays: z.number().int().min(1).max(30),
  activities: z.array(updateActivitySchema).min(1)
});

class SmartScheduleController {
  async create(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = createSmartScheduleSchema.parse(request.body);
    const schedule = await smartScheduleService.create(request.auth.sub, launchId, payload);

    response.status(201).json(schedule);
  }

  async update(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = updateSmartScheduleSchema.parse(request.body);
    const schedule = await smartScheduleService.update(request.auth.sub, launchId, payload);

    response.status(200).json(schedule);
  }
}

export const smartScheduleController = new SmartScheduleController();
