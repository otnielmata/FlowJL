import { z } from "zod";

import { classScheduleStatuses } from "../models/class-schedule.model.js";
import { classScheduleService } from "../services/class-schedule.service.js";

const statusSchema = z.enum(classScheduleStatuses);

const createClassScheduleSchema = z.object({
  launchId: z.string().uuid(),
  title: z.string().trim().min(3).max(180),
  scheduledAt: z.string().datetime(),
  responsible: z.string().trim().min(2).max(120),
  status: statusSchema,
  notes: z.string().trim().max(500).optional()
});

const listClassScheduleSchema = z
  .object({
    launchId: z.string().uuid().optional(),
    status: statusSchema.optional(),
    responsible: z.string().trim().min(2).max(120).optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    active: z.enum(["true", "false"]).transform((value) => value === "true").optional()
  })
  .superRefine((value, context) => {
    if (value.startAt && value.endAt && new Date(value.startAt).getTime() > new Date(value.endAt).getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startAt must be before or equal to endAt",
        path: ["startAt"]
      });
    }
  });

const updateClassScheduleSchema = z
  .object({
    title: z.string().trim().min(3).max(180).optional(),
    scheduledAt: z.string().datetime().optional(),
    responsible: z.string().trim().min(2).max(120).optional(),
    status: statusSchema.optional(),
    notes: z.string().trim().max(500).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed"
  });

const paramsSchema = z.object({
  classScheduleId: z.string().uuid()
});

class ClassScheduleController {
  async create(request, response) {
    const payload = createClassScheduleSchema.parse(request.body);
    const classSchedule = await classScheduleService.create(request.auth.sub, payload);

    response.status(201).json(classSchedule);
  }

  async list(request, response) {
    const filters = listClassScheduleSchema.parse(request.query);
    const classSchedules = await classScheduleService.list(filters);

    response.status(200).json(classSchedules);
  }

  async update(request, response) {
    const { classScheduleId } = paramsSchema.parse(request.params);
    const payload = updateClassScheduleSchema.parse(request.body);
    const classSchedule = await classScheduleService.update(request.auth.sub, classScheduleId, payload);

    response.status(200).json(classSchedule);
  }

  async deactivate(request, response) {
    const { classScheduleId } = paramsSchema.parse(request.params);
    const classSchedule = await classScheduleService.deactivate(request.auth.sub, classScheduleId);

    response.status(200).json(classSchedule);
  }
}

export const classScheduleController = new ClassScheduleController();
