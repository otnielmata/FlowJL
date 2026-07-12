import { z } from "zod";

import { trafficReportService } from "../services/traffic-report.service.js";

const trafficReportQuerySchema = z.object({
  launchId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime()
});

class TrafficReportController {
  async getReport(request, response) {
    const filters = trafficReportQuerySchema.parse(request.query);
    const report = await trafficReportService.getReport(filters);

    response.status(200).json(report);
  }
}

export const trafficReportController = new TrafficReportController();
