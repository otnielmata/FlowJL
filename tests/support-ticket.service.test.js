import { beforeEach, describe, expect, it, vi } from "vitest";

const supportTicketModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const launchModel = {
  findById: vi.fn()
};

const studentModel = {
  findById: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/support-ticket.model.js", () => ({
  SupportTicket: supportTicketModel,
  supportTicketPriorities: ["LOW", "MEDIUM", "HIGH", "URGENT"],
  supportTicketStatuses: ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED", "CANCELED"]
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/student.model.js", () => ({
  Student: studentModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { supportTicketService } = await import("../src/services/support-ticket.service.js");

function buildTicket(overrides = {}) {
  return {
    id: "ticket-id",
    launchId: "launch-id",
    studentId: "student-id",
    requester: "Maria Silva",
    demandType: "Acesso",
    responsibleUserId: "support-user-id",
    status: "OPEN",
    priority: "HIGH",
    observations: "Aluno sem acesso ao portal",
    interactionHistory: [
      {
        occurredAt: new Date("2026-07-12T12:00:00.000Z"),
        actorUserId: "operator-id",
        type: "NOTE",
        note: "Contato inicial"
      }
    ],
    closedAt: null,
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

describe("supportTicketService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    supportTicketModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    launchModel.findById.mockResolvedValue({ id: "launch-id", active: true });
    studentModel.findById.mockResolvedValue({ id: "student-id", active: true });
  });

  it("creates a support ticket with valid operational context and interaction history", async () => {
    supportTicketModel.create.mockResolvedValue(buildTicket());

    const result = await supportTicketService.create("operator-id", {
      launchId: "launch-id",
      studentId: "student-id",
      requester: " Maria Silva ",
      demandType: " Acesso ",
      responsibleUserId: " support-user-id ",
      status: "OPEN",
      priority: "HIGH",
      observations: " Aluno sem acesso ao portal ",
      initialInteraction: {
        type: " NOTE ",
        note: " Contato inicial "
      }
    });

    expect(supportTicketModel.create).toHaveBeenCalledWith({
      launchId: "launch-id",
      studentId: "student-id",
      requester: "Maria Silva",
      demandType: "Acesso",
      responsibleUserId: "support-user-id",
      status: "OPEN",
      priority: "HIGH",
      observations: "Aluno sem acesso ao portal",
      interactionHistory: [
        {
          occurredAt: expect.any(Date),
          actorUserId: "operator-id",
          type: "NOTE",
          note: "Contato inicial"
        }
      ],
      closedAt: null,
      active: true,
      deactivatedAt: null,
      createdBy: "operator-id",
      updatedBy: "operator-id"
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "operator-id",
      action: "SUPPORT_TICKET_CREATED",
      targetType: "SUPPORT_TICKET",
      targetId: "ticket-id",
      context: {
        launchId: "launch-id",
        studentId: "student-id",
        status: "OPEN",
        priority: "HIGH",
        responsibleUserId: "support-user-id"
      }
    });
    expect(result.id).toBe("ticket-id");
  });

  it("rejects ticket creation without launch or student context", async () => {
    await expect(
      supportTicketService.create("operator-id", {
        requester: "Maria Silva",
        demandType: "Acesso",
        responsibleUserId: "support-user-id",
        status: "OPEN"
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "A valid launch or student context must be informed"
    });
  });

  it("lists and retrieves active support tickets by default", async () => {
    supportTicketModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([buildTicket()])
    });
    supportTicketModel.findById.mockResolvedValue(buildTicket());

    const listResult = await supportTicketService.list({
      launchId: "launch-id",
      studentId: "student-id",
      responsibleUserId: " support-user-id ",
      status: "OPEN",
      priority: "HIGH"
    });
    const getResult = await supportTicketService.getById("ticket-id");

    expect(supportTicketModel.find).toHaveBeenCalledWith({
      launchId: "launch-id",
      studentId: "student-id",
      responsibleUserId: "support-user-id",
      status: "OPEN",
      priority: "HIGH",
      active: true
    });
    expect(listResult).toHaveLength(1);
    expect(getResult.id).toBe("ticket-id");
  });

  it("updates status, priority and observations while preserving interaction history", async () => {
    supportTicketModel.findById.mockResolvedValue(buildTicket());

    const result = await supportTicketService.update("operator-id", "ticket-id", {
      status: "IN_PROGRESS",
      priority: "URGENT",
      observations: "Escalado para tecnologia",
      interaction: {
        type: "STATUS_UPDATE",
        note: "Responsavel acionado"
      }
    });

    expect(supportTicketModel.updateOne).toHaveBeenCalledWith(
      { _id: "ticket-id" },
      {
        $set: {
          launchId: "launch-id",
          studentId: "student-id",
          requester: "Maria Silva",
          demandType: "Acesso",
          responsibleUserId: "support-user-id",
          status: "IN_PROGRESS",
          priority: "URGENT",
          observations: "Escalado para tecnologia",
          closedAt: null,
          updatedBy: "operator-id"
        },
        $push: {
          interactionHistory: {
            occurredAt: expect.any(Date),
            actorUserId: "operator-id",
            type: "STATUS_UPDATE",
            note: "Responsavel acionado"
          }
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "operator-id",
      action: "SUPPORT_TICKET_UPDATED",
      targetType: "SUPPORT_TICKET",
      targetId: "ticket-id",
      context: {
        launchId: "launch-id",
        studentId: "student-id",
        previousStatus: "OPEN",
        status: "IN_PROGRESS",
        previousPriority: "HIGH",
        priority: "URGENT"
      }
    });
    expect(result.interactionHistory).toHaveLength(2);
    expect(result.status).toBe("IN_PROGRESS");
  });

  it("closes a support ticket with UTC closing date", async () => {
    supportTicketModel.findById.mockResolvedValue(buildTicket());

    const result = await supportTicketService.close("operator-id", "ticket-id", {
      note: "Acesso restaurado"
    });

    expect(supportTicketModel.updateOne).toHaveBeenCalledWith(
      { _id: "ticket-id" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "RESOLVED",
          closedAt: expect.any(Date)
        }),
        $push: expect.objectContaining({
          interactionHistory: expect.objectContaining({
            type: "CLOSURE",
            note: "Acesso restaurado"
          })
        })
      })
    );
    expect(result.status).toBe("RESOLVED");
    expect(result.closedAt).toBeInstanceOf(Date);
  });

  it("deactivates a support ticket logically", async () => {
    supportTicketModel.findById.mockResolvedValue(buildTicket());

    const result = await supportTicketService.deactivate("operator-id", "ticket-id");

    expect(supportTicketModel.updateOne).toHaveBeenCalledWith(
      { _id: "ticket-id" },
      {
        $set: {
          active: false,
          deactivatedAt: expect.any(Date),
          updatedBy: "operator-id"
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SUPPORT_TICKET_DEACTIVATED",
        targetType: "SUPPORT_TICKET",
        targetId: "ticket-id"
      })
    );
    expect(result.active).toBe(false);
  });
});
