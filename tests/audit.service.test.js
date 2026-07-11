import { beforeEach, describe, expect, it, vi } from "vitest";

const auditEventModel = {
  create: vi.fn(),
  find: vi.fn()
};

vi.mock("../src/models/audit-event.model.js", () => ({
  AuditEvent: auditEventModel
}));

const { auditService } = await import("../src/services/audit.service.js");

describe("auditService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records an audit event with baseline fields", async () => {
    auditEventModel.create.mockResolvedValue({
      id: "audit-1",
      actorUserId: "admin-id",
      action: "USER_UPDATED",
      targetType: "USER",
      targetId: "user-id",
      context: { fields: ["name"] },
      occurredAt: "2026-07-11T12:00:00.000Z"
    });

    const result = await auditService.record({
      actorUserId: "admin-id",
      action: "USER_UPDATED",
      targetType: "USER",
      targetId: "user-id",
      context: { fields: ["name"] }
    });

    expect(auditEventModel.create).toHaveBeenCalledWith({
      actorUserId: "admin-id",
      action: "USER_UPDATED",
      targetType: "USER",
      targetId: "user-id",
      context: { fields: ["name"] },
      occurredAt: expect.any(Date)
    });
    expect(result).toEqual({
      id: "audit-1",
      actorUserId: "admin-id",
      action: "USER_UPDATED",
      targetType: "USER",
      targetId: "user-id",
      context: { fields: ["name"] },
      occurredAt: "2026-07-11T12:00:00.000Z"
    });
  });

  it("lists audit events ordered by most recent occurrence", async () => {
    auditEventModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        {
          id: "audit-2",
          actorUserId: "admin-id",
          action: "USER_AUTHENTICATED",
          targetType: "USER",
          targetId: "user-id",
          context: { sessionId: "session-1" },
          occurredAt: "2026-07-11T12:00:00.000Z"
        }
      ])
    });

    const result = await auditService.list();

    expect(result).toEqual([
      {
        id: "audit-2",
        actorUserId: "admin-id",
        action: "USER_AUTHENTICATED",
        targetType: "USER",
        targetId: "user-id",
        context: { sessionId: "session-1" },
        occurredAt: "2026-07-11T12:00:00.000Z"
      }
    ]);
  });
});
