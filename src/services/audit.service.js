import { AuditEvent } from "../models/audit-event.model.js";

function toPublicAuditEvent(event) {
  return {
    id: event.id,
    actorUserId: event.actorUserId ?? null,
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId,
    context: event.context ?? {},
    occurredAt: event.occurredAt
  };
}

class AuditService {
  async record(event) {
    const auditEvent = await AuditEvent.create({
      actorUserId: event.actorUserId ?? null,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      context: event.context ?? {},
      occurredAt: event.occurredAt ?? new Date()
    });

    return toPublicAuditEvent(auditEvent);
  }

  async list() {
    const events = await AuditEvent.find().sort({ occurredAt: -1 });
    return events.map((event) => toPublicAuditEvent(event));
  }
}

export const auditService = new AuditService();
export { toPublicAuditEvent };
