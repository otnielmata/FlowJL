import { z } from "zod";

import { trafficRoiService } from "../services/traffic-roi.service.js";

const trafficRoiQuerySchema = z.object({
  launchId: z.string().uuid(),
  campaignId: z.string().uuid().optional(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime()
});

class TrafficRoiController {
  async calculate(request, response) {
    const filters = trafficRoiQuerySchema.parse(request.query);
    const roi = await trafficRoiService.calculate(request.auth.sub, filters);

    response.status(200).json(roi);
  }
}

export const trafficRoiController = new TrafficRoiController();
