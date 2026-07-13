import { z } from "zod";

import { reportViewTypes } from "../models/report-view.model.js";
import { reportsService } from "../services/reports.service.js";

const filtersSchema = z.object({
  launchId: z.string().uuid().optional(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  comparePeriodStart: z.string().datetime().optional(),
  comparePeriodEnd: z.string().datetime().optional(),
  responsible: z.string().trim().min(2).max(120).optional(),
  channel: z.string().trim().min(2).max(50).optional(),
  campaignId: z.string().uuid().optional(),
  status: z.string().trim().min(2).max(50).optional(),
  approvalStatus: z.string().trim().min(2).max(50).optional()
}).refine((data) => Boolean(data.comparePeriodStart) === Boolean(data.comparePeriodEnd), {
  message: "comparePeriodStart and comparePeriodEnd must be informed together",
  path: ["comparePeriodStart"]
});

const exportSchema = z.object({
  actionType: z.enum(["EXPORT", "PRINT"]),
  format: z.enum(["CSV", "PDF", "XLSX", "PRINT"]),
  filters: filtersSchema
});

const saveViewSchema = z.object({
  name: z.string().trim().min(3).max(140),
  description: z.string().trim().min(3).max(240).optional(),
  type: z.enum(reportViewTypes),
  filters: filtersSchema,
  layout: z.object({
    widgets: z.array(z.string().trim().min(2).max(80)).max(20).optional().default([]),
    shared: z.boolean().optional().default(false)
  }).optional()
});

const listViewsQuerySchema = z.object({
  type: z.enum(reportViewTypes).optional()
});

class ReportsController {
  async getAnalytics(request, response) {
    const filters = filtersSchema.parse(request.query);
    const report = await reportsService.getAnalytics(request.auth.sub, filters);

    response.status(200).json(report);
  }

  async exportAnalysis(request, response) {
    const payload = exportSchema.parse(request.body);
    const result = await reportsService.exportAnalysis(request.auth.sub, payload);

    response.status(200).json(result);
  }

  async saveView(request, response) {
    const payload = saveViewSchema.parse(request.body);
    const view = await reportsService.saveView(request.auth.sub, payload);

    response.status(201).json(view);
  }

  async listViews(request, response) {
    const query = listViewsQuerySchema.parse(request.query);
    const views = await reportsService.listViews(request.auth.sub, query.type);

    response.status(200).json(views);
  }
}

export const reportsController = new ReportsController();
