import { z } from "zod";

import { launchService } from "../services/launch.service.js";

const launchMilestoneSchema = z.object({
  name: z.string().trim().min(3).max(120),
  scheduledAt: z.string().datetime()
});

const createLaunchSchema = z.object({
  name: z.string().trim().min(3).max(160),
  expert: z.string().trim().min(3).max(160),
  product: z.string().trim().min(3).max(160),
  responsibleUserId: z.string().uuid().optional(),
  status: z.enum(["PLANNING", "WARMUP", "PRE_LAUNCH", "OPEN_CART", "IN_PROGRESS", "COMPLETED", "PAUSED", "ARCHIVED"]).optional(),
  baseDate: z.string().datetime(),
  milestones: z.array(launchMilestoneSchema).min(1),
  phaseDates: z.object({
    warmupStart: z.string().datetime().optional(),
    cpl1At: z.string().datetime().optional(),
    cpl2At: z.string().datetime().optional(),
    cpl3At: z.string().datetime().optional(),
    cartOpenAt: z.string().datetime().optional(),
    cartCloseAt: z.string().datetime().optional(),
    deliveryAt: z.string().datetime().optional()
  }).optional(),
  goals: z.object({
    leadTarget: z.number().nonnegative().optional(),
    salesTarget: z.number().nonnegative().optional(),
    revenueTarget: z.number().nonnegative().optional()
  }).optional()
});

const listLaunchesSchema = z.object({
  status: z.enum(["PLANNING", "WARMUP", "PRE_LAUNCH", "OPEN_CART", "IN_PROGRESS", "COMPLETED", "PAUSED", "ARCHIVED"]).optional(),
  responsibleUserId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(160).optional(),
  active: z.coerce.boolean().optional()
});

class LaunchController {
  async list(request, response) {
    const filters = listLaunchesSchema.parse(request.query);
    const launches = await launchService.list(filters);

    response.status(200).json(launches);
  }

  async create(request, response) {
    const payload = createLaunchSchema.parse(request.body);
    const launch = await launchService.create(request.auth.sub, payload);

    response.status(201).json(launch);
  }

  async getById(request, response) {
    const params = z.object({
      launchId: z.string().uuid()
    }).parse(request.params);
    const launch = await launchService.getById(params.launchId);

    response.status(200).json(launch);
  }
}

export const launchController = new LaunchController();
