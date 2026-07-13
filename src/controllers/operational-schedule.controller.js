import { z } from "zod";

import {
  operationalScheduleAreas,
  operationalSchedulePriorities,
  operationalScheduleStatuses,
  operationalScheduleTypes,
  operationalScheduleViews
} from "../models/operational-schedule.model.js";
import { operationalScheduleService } from "../services/operational-schedule.service.js";

const viewSchema = z.enum(operationalScheduleViews);
const areaSchema = z.enum(operationalScheduleAreas);
const prioritySchema = z.enum(operationalSchedulePriorities);
const statusSchema = z.enum(operationalScheduleStatuses);
const typeSchema = z.enum(operationalScheduleTypes);

const checklistItemSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(2).max(160),
  required: z.boolean().optional(),
  completed: z.boolean().optional()
});

const attachmentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(180),
  url: z.string().trim().url(),
  mediaType: z.string().trim().min(2).max(120).optional()
});

const commentSchema = z.object({
  id: z.string().uuid().optional(),
  authorUserId: z.string().trim().min(2).max(120),
  authorName: z.string().trim().min(2).max(120),
  message: z.string().trim().min(2).max(500),
  createdAt: z.string().datetime()
});

const createOperationalScheduleSchema = z.object({
  launchId: z.string().uuid(),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().max(2000).optional(),
  area: areaSchema,
  priority: prioritySchema,
  status: statusSchema,
  type: typeSchema,
  responsible: z.string().trim().min(2).max(120),
  startsAt: z.string().datetime(),
  dueAt: z.string().datetime(),
  timelinePosition: z.number().int().min(0).optional(),
  dependencyIds: z.array(z.string().uuid()).max(20).optional().default([]),
  checklist: z.array(checklistItemSchema).max(20).optional().default([]),
  attachments: z.array(attachmentSchema).max(20).optional().default([]),
  comments: z.array(commentSchema).max(20).optional().default([]),
  tags: z.array(z.string().trim().min(2).max(60)).max(12).optional().default([])
});

const listOperationalScheduleSchema = z
  .object({
    launchId: z.string().uuid().optional(),
    responsible: z.string().trim().min(2).max(120).optional(),
    area: areaSchema.optional(),
    priority: prioritySchema.optional(),
    status: statusSchema.optional(),
    type: typeSchema.optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    view: viewSchema.optional(),
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

const updateOperationalScheduleSchema = z
  .object({
    title: z.string().trim().min(3).max(180).optional(),
    description: z.string().trim().max(2000).optional(),
    area: areaSchema.optional(),
    priority: prioritySchema.optional(),
    status: statusSchema.optional(),
    type: typeSchema.optional(),
    responsible: z.string().trim().min(2).max(120).optional(),
    startsAt: z.string().datetime().optional(),
    dueAt: z.string().datetime().optional(),
    timelinePosition: z.number().int().min(0).optional(),
    dependencyIds: z.array(z.string().uuid()).max(20).optional(),
    checklist: z.array(checklistItemSchema).max(20).optional(),
    attachments: z.array(attachmentSchema).max(20).optional(),
    comments: z.array(commentSchema).max(20).optional(),
    tags: z.array(z.string().trim().min(2).max(60)).max(12).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed"
  });

const replanOperationalScheduleSchema = z.object({
  view: viewSchema.optional(),
  filters: z
    .object({
      responsible: z.string().trim().min(2).max(120).optional(),
      area: areaSchema.optional(),
      priority: prioritySchema.optional(),
      status: statusSchema.optional(),
      type: typeSchema.optional(),
      startAt: z.string().datetime().optional(),
      endAt: z.string().datetime().optional()
    })
    .optional(),
  items: z
    .array(
      z.object({
        activityId: z.string().uuid(),
        startsAt: z.string().datetime().optional(),
        dueAt: z.string().datetime().optional(),
        status: statusSchema.optional(),
        timelinePosition: z.number().int().min(0).optional(),
        dependencyIds: z.array(z.string().uuid()).max(20).optional()
      })
    )
    .min(1)
    .max(50)
});

const paramsSchema = z.object({
  activityId: z.string().uuid()
});

class OperationalScheduleController {
  async create(request, response) {
    const payload = createOperationalScheduleSchema.parse(request.body);
    const schedule = await operationalScheduleService.create(request.auth.sub, payload);

    response.status(201).json(schedule);
  }

  async list(request, response) {
    const filters = listOperationalScheduleSchema.parse(request.query);
    const schedules = await operationalScheduleService.list(filters);

    response.status(200).json(schedules);
  }

  async getById(request, response) {
    const { activityId } = paramsSchema.parse(request.params);
    const schedule = await operationalScheduleService.getById(activityId);

    response.status(200).json(schedule);
  }

  async update(request, response) {
    const { activityId } = paramsSchema.parse(request.params);
    const payload = updateOperationalScheduleSchema.parse(request.body);
    const schedule = await operationalScheduleService.update(request.auth.sub, activityId, payload);

    response.status(200).json(schedule);
  }

  async replan(request, response) {
    const payload = replanOperationalScheduleSchema.parse(request.body);
    const result = await operationalScheduleService.replan(request.auth.sub, payload);

    response.status(200).json(result);
  }
}

export const operationalScheduleController = new OperationalScheduleController();
