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
  baseDate: z.string().datetime(),
  milestones: z.array(launchMilestoneSchema).min(1)
});

class LaunchController {
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
