import { z } from "zod";

import { platformSettingService } from "../services/platform-setting.service.js";

const settingKeySchema = z.object({
  key: z.string().trim().min(3).max(120)
});

const updatePlatformSettingSchema = z.object({
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.record(z.string(), z.unknown())
  ])
});

class PlatformSettingController {
  async list(_request, response) {
    const settings = await platformSettingService.list();

    response.status(200).json(settings);
  }

  async update(request, response) {
    const { key } = settingKeySchema.parse(request.params);
    const payload = updatePlatformSettingSchema.parse(request.body);
    const setting = await platformSettingService.update(request.auth.sub, key, payload);

    response.status(200).json(setting);
  }
}

export const platformSettingController = new PlatformSettingController();
