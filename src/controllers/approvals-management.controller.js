import { z } from "zod";

import { approvalsManagementService } from "../services/approvals-management.service.js";

const paramsSchema = z.object({
  approvalType: z.enum(["CONTENT", "EXPERT"]),
  approvalId: z.string().uuid()
});

const decideSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT", "REQUEST_ADJUST"]),
  comment: z.string().trim().min(3).max(1000).optional()
}).superRefine((value, context) => {
  if (["REJECT", "REQUEST_ADJUST"].includes(value.decision) && !value.comment) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "comment is required for reject or request adjust",
      path: ["comment"]
    });
  }
});

class ApprovalsManagementController {
  async list(request, response) {
    const result = await approvalsManagementService.list(request.auth.sub);

    response.status(200).json(result);
  }

  async getById(request, response) {
    const { approvalType, approvalId } = paramsSchema.parse(request.params);
    const result = await approvalsManagementService.getById(request.auth.sub, approvalType, approvalId);

    response.status(200).json(result);
  }

  async decide(request, response) {
    const { approvalType, approvalId } = paramsSchema.parse(request.params);
    const payload = decideSchema.parse(request.body);
    const result = await approvalsManagementService.decide(request.auth.sub, approvalType, approvalId, payload);

    response.status(200).json(result);
  }
}

export const approvalsManagementController = new ApprovalsManagementController();
