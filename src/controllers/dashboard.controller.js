import { z } from "zod";

import { dashboardService } from "../services/dashboard.service.js";

const querySchema = z.object({
  launchId: z.string().uuid().optional()
});

class DashboardController {
  async getStrategistDashboard(request, response) {
    const filters = querySchema.parse(request.query);
    const dashboard = await dashboardService.getStrategistDashboard(filters);

    response.status(200).json(dashboard);
  }
}

export const dashboardController = new DashboardController();
