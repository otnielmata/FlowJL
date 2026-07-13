import { z } from "zod";

import { userPreferenceThemes } from "../models/user-preference.model.js";
import { settingsService } from "../services/settings.service.js";

const updatePersonalSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  email: z.string().trim().email().optional(),
  profile: z.object({
    displayName: z.string().trim().min(3).max(120).optional(),
    jobTitle: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().min(8).max(30).optional(),
    avatarUrl: z.string().trim().url().optional()
  }).optional(),
  preferences: z.object({
    theme: z.enum(userPreferenceThemes).optional(),
    locale: z.string().trim().min(2).max(20).optional(),
    timezone: z.string().trim().min(2).max(60).optional(),
    compactSidebar: z.boolean().optional()
  }).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    approvals: z.boolean().optional(),
    operations: z.boolean().optional(),
    reports: z.boolean().optional()
  }).optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be sent"
});

const sectionParamsSchema = z.object({
  sectionKey: z.string().trim().min(2)
});

class SettingsController {
  async getPersonal(request, response) {
    const settings = await settingsService.getPersonalSettings(request.auth.sub);
    response.status(200).json(settings);
  }

  async updatePersonal(request, response) {
    const payload = updatePersonalSchema.parse(request.body);
    const settings = await settingsService.updatePersonalSettings(request.auth.sub, payload);
    response.status(200).json(settings);
  }

  async getAdminOverview(request, response) {
    const overview = await settingsService.getAdminOverview(request.auth.sub);
    response.status(200).json(overview);
  }

  async getSection(request, response) {
    const { sectionKey } = sectionParamsSchema.parse(request.params);
    const section = await settingsService.getSection(request.auth.sub, sectionKey);
    response.status(section.authorized ? 200 : 403).json(section);
  }
}

export const settingsController = new SettingsController();
