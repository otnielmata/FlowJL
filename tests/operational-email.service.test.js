import { beforeEach, describe, expect, it, vi } from "vitest";

const operationalEmailModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const launchModel = {
  findById: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/operational-email.model.js", () => ({
  OperationalEmail: operationalEmailModel,
  operationalEmailStatuses: ["TODO", "IN_PROGRESS", "SCHEDULED", "SENT", "DONE", "BLOCKED", "CANCELED"]
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { operationalEmailService } = await import("../src/services/operational-email.service.js");

function buildOperationalEmail(overrides = {}) {
  return {
    id: "operational-email-id",
    launchId: "launch-id",
    objective: "Enviar lembrete operacional da aula",
    responsible: "Operacoes",
    dueAt: new Date("2026-07-25T12:00:00.000Z"),
    status: "TODO",
    audience: "Alunos inscritos",
    subject: "Lembrete da aula de hoje",
    observations: "Revisar link antes do envio",
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

describe("operationalEmailService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    operationalEmailModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  });

  it("creates an operational email action with launch context and UTC due date", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id", active: true });
    operationalEmailModel.create.mockResolvedValue(buildOperationalEmail());

    const result = await operationalEmailService.create("operator-id", {
      launchId: "launch-id",
      objective: " Enviar lembrete operacional da aula ",
      responsible: " Operacoes ",
      dueAt: "2026-07-25T12:00:00.000Z",
      status: "TODO",
      audience: " Alunos inscritos ",
      subject: " Lembrete da aula de hoje ",
      observations: " Revisar link antes do envio "
    });

    expect(operationalEmailModel.create).toHaveBeenCalledWith({
      launchId: "launch-id",
      objective: "Enviar lembrete operacional da aula",
      responsible: "Operacoes",
      dueAt: new Date("2026-07-25T12:00:00.000Z"),
      status: "TODO",
      audience: "Alunos inscritos",
      subject: "Lembrete da aula de hoje",
      observations: "Revisar link antes do envio",
      active: true,
      deactivatedAt: null,
      createdBy: "operator-id",
      updatedBy: "operator-id"
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "operator-id",
      action: "OPERATIONAL_EMAIL_CREATED",
      targetType: "OPERATIONAL_EMAIL",
      targetId: "operational-email-id",
      context: {
        launchId: "launch-id",
        dueAt: new Date("2026-07-25T12:00:00.000Z"),
        responsible: "Operacoes",
        status: "TODO",
        objective: "Enviar lembrete operacional da aula"
      }
    });
    expect(result.dueAt).toEqual(new Date("2026-07-25T12:00:00.000Z"));
  });

  it("lists active operational email actions filtered by launch, responsible, status and period", async () => {
    operationalEmailModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([buildOperationalEmail()])
    });

    const result = await operationalEmailService.list({
      launchId: "launch-id",
      responsible: " Operacoes ",
      status: "SCHEDULED",
      startAt: "2026-07-25T00:00:00.000Z",
      endAt: "2026-07-25T23:59:59.999Z"
    });

    expect(operationalEmailModel.find).toHaveBeenCalledWith({
      launchId: "launch-id",
      status: "SCHEDULED",
      responsible: "Operacoes",
      active: true,
      dueAt: {
        $gte: new Date("2026-07-25T00:00:00.000Z"),
        $lte: new Date("2026-07-25T23:59:59.999Z")
      }
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("operational-email-id");
  });

  it("updates status, due date and observations with audit trail", async () => {
    operationalEmailModel.findById.mockResolvedValue(buildOperationalEmail());

    const result = await operationalEmailService.update("operator-id", "operational-email-id", {
      dueAt: "2026-07-25T13:00:00.000Z",
      status: "SCHEDULED",
      observations: "Envio configurado na ferramenta"
    });

    expect(operationalEmailModel.updateOne).toHaveBeenCalledWith(
      { _id: "operational-email-id" },
      {
        $set: {
          objective: "Enviar lembrete operacional da aula",
          responsible: "Operacoes",
          dueAt: new Date("2026-07-25T13:00:00.000Z"),
          status: "SCHEDULED",
          audience: "Alunos inscritos",
          subject: "Lembrete da aula de hoje",
          observations: "Envio configurado na ferramenta",
          updatedBy: "operator-id"
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "operator-id",
      action: "OPERATIONAL_EMAIL_UPDATED",
      targetType: "OPERATIONAL_EMAIL",
      targetId: "operational-email-id",
      context: {
        launchId: "launch-id",
        previousStatus: "TODO",
        status: "SCHEDULED",
        previousDueAt: new Date("2026-07-25T12:00:00.000Z"),
        dueAt: new Date("2026-07-25T13:00:00.000Z"),
        previousResponsible: "Operacoes",
        responsible: "Operacoes",
        observationsChanged: true
      }
    });
    expect(result.status).toBe("SCHEDULED");
  });

  it("rejects creation when launch context does not exist", async () => {
    launchModel.findById.mockResolvedValue(null);

    await expect(
      operationalEmailService.create("operator-id", {
        launchId: "launch-id",
        objective: "Enviar lembrete",
        responsible: "Operacoes",
        dueAt: "2026-07-25T12:00:00.000Z",
        status: "TODO"
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Launch not found"
    });
  });

  it("deactivates an operational email action logically", async () => {
    operationalEmailModel.findById.mockResolvedValue(buildOperationalEmail());

    const result = await operationalEmailService.deactivate("operator-id", "operational-email-id");

    expect(operationalEmailModel.updateOne).toHaveBeenCalledWith(
      { _id: "operational-email-id" },
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
        action: "OPERATIONAL_EMAIL_DEACTIVATED",
        targetType: "OPERATIONAL_EMAIL",
        targetId: "operational-email-id"
      })
    );
    expect(result.active).toBe(false);
    expect(result.deactivatedAt).toEqual(expect.any(Date));
  });
});
