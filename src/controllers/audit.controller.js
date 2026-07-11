import { auditService } from "../services/audit.service.js";

class AuditController {
  async list(_request, response) {
    const events = await auditService.list();

    response.status(200).json({
      items: events
    });
  }
}

export const auditController = new AuditController();
