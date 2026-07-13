import { z } from "zod";

import {
  operationalScheduleAreas,
  operationalSchedulePriorities,
  operationalScheduleRecurrenceFrequencies,
  operationalScheduleStatuses,
  operationalScheduleTypes,
  operationalScheduleViews
} from "../models/operational-schedule.model.js";
import { operationsManagementService } from "../services/operations-management.service.js";

const viewSchema = z.enum(operationalScheduleViews);
const areaSchema = z.enum(operationalScheduleAreas);
const prioritySchema = z.enum(operationalSchedulePriorities);
const statusSchema = z.enum(operationalScheduleStatuses);
const typeSchema = z.enum(operationalScheduleTypes);
const recurrenceFrequencySchema = z.enum(operationalScheduleRecurrenceFrequencies);

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

const recurrenceSchema = z.object({
  frequency: recurrenceFrequencySchema,
  interval: z.number().int().min(1).optional(),
  count: z.number().int().min(1).optional(),
  until: z.string().datetime().optional()
});

const reminderSchema = z.object({
  enabled: z.boolean().optional(),
  remindAt: z.string().datetime().optional(),
  channel: z.string().trim().min(2).max(80).optional()
});

const relationshipsSchema = z.object({
  checklistId: z.string().uuid().optional(),
  classScheduleId: z.string().uuid().optional(),
  liveEventId: z.string().uuid().optional(),
  relatedLink: z.string().trim().url().optional()
});

const listSchema = z
  .object({
    launchId: z.string().uuid().optional(),
    responsible: z.string().trim().min(2).max(120).optional(),
    area: areaSchema.optional(),
    priority: prioritySchema.optional(),
    status: statusSchema.optional(),
    type: typeSchema.optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    view: viewSchema.optional()
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

const createSchema = z.object({
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
  tags: z.array(z.string().trim().min(2).max(60)).max(12).optional().default([]),
  recurrence: recurrenceSchema.optional(),
  reminder: reminderSchema.optional(),
  relationships: relationshipsSchema.optional()
});

const updateSchema = z
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
    tags: z.array(z.string().trim().min(2).max(60)).max(12).optional(),
    recurrence: recurrenceSchema.optional(),
    reminder: reminderSchema.optional(),
    relationships: relationshipsSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed"
  });

const executionSchema = z
  .object({
    status: statusSchema.optional(),
    attendance: z
      .object({
        present: z.boolean()
      })
      .optional(),
    checklist: z
      .array(
        z.object({
          id: z.string().uuid(),
          label: z.string().trim().min(2).max(160).optional(),
          required: z.boolean().optional(),
          completed: z.boolean().optional()
        })
      )
      .optional(),
    complete: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed"
  });

const paramsSchema = z.object({
  activityId: z.string().uuid()
});

class OperationsManagementController {
  async list(request, response) {
    const filters = listSchema.parse(request.query);
    const result = await operationsManagementService.list(filters);

    response.status(200).json(result);
  }

  async create(request, response) {
    const payload = createSchema.parse(request.body);
    const result = await operationsManagementService.createActivity(request.auth.sub, payload);

    response.status(201).json(result);
  }

  async update(request, response) {
    const { activityId } = paramsSchema.parse(request.params);
    const payload = updateSchema.parse(request.body);
    const result = await operationsManagementService.updateActivity(request.auth.sub, activityId, payload);

    response.status(200).json(result);
  }

  async recordExecution(request, response) {
    const { activityId } = paramsSchema.parse(request.params);
    const payload = executionSchema.parse(request.body);
    const result = await operationsManagementService.recordExecution(request.auth.sub, activityId, payload);

    response.status(200).json(result);
  }
}

export const operationsManagementController = new OperationsManagementController();
