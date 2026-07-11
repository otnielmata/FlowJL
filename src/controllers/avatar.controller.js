import { z } from "zod";

import { avatarService } from "../services/avatar.service.js";

const paramsSchema = z.object({
  launchId: z.string().uuid()
});

const avatarPayloadSchema = z.object({
  profile: z.string().trim().min(10).max(1000),
  pains: z.array(z.string().trim().min(3).max(240)).min(1),
  dreams: z.array(z.string().trim().min(3).max(240)).min(1),
  objections: z.array(z.string().trim().min(3).max(240)).min(1),
  language: z.array(z.string().trim().min(3).max(240)).min(1)
});

class AvatarController {
  async create(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = avatarPayloadSchema.parse(request.body);
    const avatar = await avatarService.create(request.auth.sub, launchId, payload);

    response.status(201).json(avatar);
  }

  async update(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = avatarPayloadSchema.parse(request.body);
    const avatar = await avatarService.update(request.auth.sub, launchId, payload);

    response.status(200).json(avatar);
  }

  async suggest(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const suggestions = await avatarService.suggest(launchId);

    response.status(200).json(suggestions);
  }
}

export const avatarController = new AvatarController();
