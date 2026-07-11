import { z } from "zod";

import { expertApprovalService } from "../services/expert-approval.service.js";

const paramsSchema = z.object({
  launchId: z.string().uuid()
});

const submitExpertApprovalSchema = z.object({
  observations: z.string().trim().min(3).max(1000).optional()
});

const decideExpertApprovalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  observations: z.string().trim().min(3).max(1000)
});

class ExpertApprovalController {
  async submit(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = submitExpertApprovalSchema.parse(request.body ?? {});
    const approval = await expertApprovalService.submit(request.auth.sub, launchId, payload);

    response.status(201).json(approval);
  }

  async decide(request, response) {
    const { launchId } = paramsSchema.parse(request.params);
    const payload = decideExpertApprovalSchema.parse(request.body);
    const approval = await expertApprovalService.decide(request.auth.sub, launchId, payload);

    response.status(200).json(approval);
  }
}

export const expertApprovalController = new ExpertApprovalController();
