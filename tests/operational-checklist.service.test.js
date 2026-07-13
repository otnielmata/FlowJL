import { beforeEach, describe, expect, it, vi } from "vitest";

const operationalChecklistModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const launchModel = { findById: vi.fn() };
const classScheduleModel = { findById: vi.fn() };
const liveEventModel = { findById: vi.fn() };
const discordOperationModel = { findById: vi.fn() };
const operationalEmailModel = { findById: vi.fn() };
const studentModel = { findById: vi.fn() };
const supportTicketModel = { findById: vi.fn() };
const auditServiceMock = { record: vi.fn() };

vi.mock("../src/models/operational-checklist.model.js", () => ({
  OperationalChecklist: operationalChecklistModel,
  operationalChecklistOperationTypes: ["LAUNCH", "CLASS_SCHEDULE", "LIVE_EVENT", "DISCORD_OPERATION", "OPERATIONAL_EMAIL", "STUDENT", "SUPPORT_TICKET"],
  operationalChecklistStatuses: ["OPEN", "PARTIAL", "COMPLETED"]
}));

vi.mock("../src/models/launch.model.js", () => ({ Launch: launchModel }));
vi.mock("../src/models/class-schedule.model.js", () => ({ ClassSchedule: classScheduleModel }));
vi.mock("../src/models/live-event.model.js", () => ({ LiveEvent: liveEventModel }));
vi.mock("../src/models/discord-operation.model.js", () => ({ DiscordOperation: discordOperationModel }));
vi.mock("../src/models/operational-email.model.js", () => ({ OperationalEmail: operationalEmailModel }));
vi.mock("../src/models/student.model.js", () => ({ Student: studentModel }));
vi.mock("../src/models/support-ticket.model.js", () => ({ SupportTicket: supportTicketModel }));
vi.mock("../src/services/audit.service.js", () => ({ auditService: auditServiceMock }));

const { operationalChecklistService } = await import("../src/services/operational-checklist.service.js");

function buildChecklist(overrides = {}) {
  return {
    id: "checklist-id",
    operationType: "LIVE_EVENT",
    contextId: "context-id",
    title: "Checklist do evento",
    status: "PARTIAL",
    items: [
      {
        id: "item-1",
        label: "Link validado",
        required: true,
        completed: true,
        completedBy: "operator-id",
        completedAt: new Date("2026-07-12T12:00:00.000Z"),
        notes: null
      },
      {
        id: "item-2",
        label: "Equipe acionada",
        required: true,
        completed: false,
        completedBy: null,
        completedAt: null,
        notes: null
      }
    ],
    history: [],
    completedAt: null,
    active: true,
    deactivatedAt: null,
    createdAt: new Date("2026-07-12T12:00:00.000Z"),
    updatedAt: new Date("2026-07-12T12:00:00.000Z"),
    createdBy: "operator-id",
    updatedBy: "operator-id",
    toObject() {
      return { ...this };
    },
    ...overrides
  };
}

describe("operationalChecklistService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    operationalChecklistModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    launchModel.findById.mockResolvedValue({ id: "context-id", active: true });
    classScheduleModel.findById.mockResolvedValue({ id: "context-id", active: true });
    liveEventModel.findById.mockResolvedValue({ id: "context-id", active: true });
    discordOperationModel.findById.mockResolvedValue({ id: "context-id", active: true });
    operationalEmailModel.findById.mockResolvedValue({ id: "context-id", active: true });
    studentModel.findById.mockResolvedValue({ id: "context-id", active: true });
    supportTicketModel.findById.mockResolvedValue({ id: "context-id", active: true });
  });

  it("registers an operational checklist with configured items and audit history", async () => {
    operationalChecklistModel.create.mockResolvedValue(buildChecklist());

    const result = await operationalChecklistService.create("operator-id", {
      operationType: "LIVE_EVENT",
      contextId: "context-id",
      title: " Checklist do evento ",
      items: [
        { id: "item-1", label: " Link validado ", required: true, completed: true },
        { id: "item-2", label: " Equipe acionada ", required: true, completed: false }
      ]
    });

    expect(liveEventModel.findById).toHaveBeenCalledWith("context-id");
    expect(operationalChecklistModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        operationType: "LIVE_EVENT",
        contextId: "context-id",
        title: "Checklist do evento",
        status: "PARTIAL",
        completedAt: null,
        active: true,
        createdBy: "operator-id",
        updatedBy: "operator-id"
      })
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "operator-id",
      action: "OPERATIONAL_CHECKLIST_CREATED",
      targetType: "OPERATIONAL_CHECKLIST",
      targetId: "checklist-id",
      context: {
        operationType: "LIVE_EVENT",
        contextId: "context-id",
        status: "PARTIAL",
        completedAt: null
      }
    });
    expect(result.id).toBe("checklist-id");
  });

  it("rejects conclusion when required items are pending", async () => {
    operationalChecklistModel.findById.mockResolvedValue(buildChecklist());

    await expect(operationalChecklistService.complete("operator-id", "checklist-id")).rejects.toMatchObject({
      statusCode: 409,
      message: "Required operational checklist items must be completed before conclusion"
    });
  });

  it("completes a checklist with UTC completion date when required items are done", async () => {
    operationalChecklistModel.findById.mockResolvedValue(buildChecklist());

    const result = await operationalChecklistService.update("operator-id", "checklist-id", {
      items: [{ id: "item-2", completed: true, notes: "Equipe confirmada" }],
      conclude: true
    });

    expect(operationalChecklistModel.updateOne).toHaveBeenCalledWith(
      { _id: "checklist-id" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "COMPLETED",
          completedAt: expect.any(Date),
          updatedBy: "operator-id"
        }),
        $push: expect.objectContaining({
          history: expect.objectContaining({
            action: "COMPLETED",
            fromStatus: "PARTIAL",
            toStatus: "COMPLETED",
            actedBy: "operator-id",
            actedAt: expect.any(Date)
          })
        })
      })
    );
    expect(result.status).toBe("COMPLETED");
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  it("lists and retrieves active checklists by default", async () => {
    operationalChecklistModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([buildChecklist()])
    });
    operationalChecklistModel.findById.mockResolvedValue(buildChecklist());

    const listResult = await operationalChecklistService.list({
      operationType: "LIVE_EVENT",
      contextId: "context-id",
      status: "PARTIAL"
    });
    const getResult = await operationalChecklistService.getById("checklist-id");

    expect(operationalChecklistModel.find).toHaveBeenCalledWith({
      operationType: "LIVE_EVENT",
      contextId: "context-id",
      status: "PARTIAL",
      active: true
    });
    expect(listResult).toHaveLength(1);
    expect(getResult.id).toBe("checklist-id");
  });

  it("deactivates a checklist logically while preserving history", async () => {
    operationalChecklistModel.findById.mockResolvedValue(buildChecklist());

    const result = await operationalChecklistService.deactivate("operator-id", "checklist-id");

    expect(operationalChecklistModel.updateOne).toHaveBeenCalledWith(
      { _id: "checklist-id" },
      expect.objectContaining({
        $set: {
          active: false,
          deactivatedAt: expect.any(Date),
          updatedBy: "operator-id"
        },
        $push: expect.objectContaining({
          history: expect.objectContaining({
            action: "DEACTIVATED"
          })
        })
      })
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OPERATIONAL_CHECKLIST_DEACTIVATED",
        targetType: "OPERATIONAL_CHECKLIST",
        targetId: "checklist-id"
      })
    );
    expect(result.active).toBe(false);
  });
});
