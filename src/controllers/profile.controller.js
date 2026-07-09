import { z } from "zod";

import { profileService } from "../services/profile.service.js";

const profileSchema = z.object({
  name: z.string().min(3),
  code: z.string().min(2).max(20),
  description: z.string().min(5),
  permissions: z.array(z.string()).default([]),
  active: z.boolean().optional()
});

const updateProfileSchema = profileSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field must be sent"
);

class ProfileController {
  async create(request, response) {
    const payload = profileSchema.parse(request.body);
    const profile = await profileService.create(payload);
    response.status(201).json(profile);
  }

  async update(request, response) {
    const payload = updateProfileSchema.parse(request.body);
    const profile = await profileService.update(request.params.id, payload);
    response.status(200).json(profile);
  }

  async list(_request, response) {
    const profiles = await profileService.list();
    response.status(200).json({
      items: profiles
    });
  }
}

export const profileController = new ProfileController();
