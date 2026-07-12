import { beforeEach, describe, expect, it, vi } from "vitest";

const classScheduleModel = {
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

vi.mock("../src/models/class-schedule.model.js", () => ({
  ClassSchedule: classScheduleModel,
  classScheduleStatuses: ["PLANNED", "CONFIRMED", "COMPLETED", "CANCELED", "RESCHEDULED"]
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { classScheduleService } = await import("../src/services/class-schedule.service.js");

function buildClassSchedule(overrides = {}) {
  return {
    id: "schedule-id",
    launchId: "launch-id",
    title: "Aula 1 - Boas-vindas",
    scheduledAt: new Date("2026-07-20T14:00:00.000Z"),
    responsible: "Operacoes",
    status: "PLANNED",
    notes: "Aula inaugural",
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

describe("classScheduleService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    classScheduleModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  });

  it("creates a class schedule with launch context and UTC schedule", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id", active: true });
    classScheduleModel.create.mockResolvedValue(buildClassSchedule());

    const result = await classScheduleService.create("operator-id", {
      launchId: "launch-id",
      title: " Aula 1 - Boas-vindas ",
      scheduledAt: "2026-07-20T14:00:00.000Z",
      responsible: " Operacoes ",
      status: "PLANNED",
      notes: " Aula inaugural "
    });

    expect(classScheduleModel.create).toHaveBeenCalledWith({
      launchId: "launch-id",
      title: "Aula 1 - Boas-vindas",
      scheduledAt: new Date("2026-07-20T14:00:00.000Z"),
      responsible: "Operacoes",
      status: "PLANNED",
      notes: "Aula inaugural",
      active: true,
      deactivatedAt: null,
      createdBy: "operator-id",
      updatedBy: "operator-id"
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "operator-id",
      action: "CLASS_SCHEDULE_CREATED",
      targetType: "CLASS_SCHEDULE",
      targetId: "schedule-id",
      context: {
        launchId: "launch-id",
        scheduledAt: new Date("2026-07-20T14:00:00.000Z"),
        responsible: "Operacoes",
        status: "PLANNED"
      }
    });
    expect(result.scheduledAt).toEqual(new Date("2026-07-20T14:00:00.000Z"));
  });

  it("lists active class schedules filtered by launch, status, responsible and period", async () => {
    classScheduleModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([buildClassSchedule()])
    });

    const result = await classScheduleService.list({
      launchId: "launch-id",
      status: "CONFIRMED",
      responsible: " Operacoes ",
      startAt: "2026-07-20T00:00:00.000Z",
      endAt: "2026-07-20T23:59:59.999Z"
    });

    expect(classScheduleModel.find).toHaveBeenCalledWith({
      launchId: "launch-id",
      status: "CONFIRMED",
      responsible: "Operacoes",
      active: true,
      scheduledAt: {
        $gte: new Date("2026-07-20T00:00:00.000Z"),
        $lte: new Date("2026-07-20T23:59:59.999Z")
      }
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("schedule-id");
  });

  it("updates schedule, responsible and status with audit trail", async () => {
    classScheduleModel.findById.mockResolvedValue(buildClassSchedule());

    const result = await classScheduleService.update("operator-id", "schedule-id", {
      scheduledAt: "2026-07-21T16:00:00.000Z",
      responsible: "Suporte",
      status: "RESCHEDULED"
    });

    expect(classScheduleModel.updateOne).toHaveBeenCalledWith(
      { _id: "schedule-id" },
      {
        $set: {
          title: "Aula 1 - Boas-vindas",
          scheduledAt: new Date("2026-07-21T16:00:00.000Z"),
          responsible: "Suporte",
          status: "RESCHEDULED",
          notes: "Aula inaugural",
          updatedBy: "operator-id"
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "operator-id",
      action: "CLASS_SCHEDULE_UPDATED",
      targetType: "CLASS_SCHEDULE",
      targetId: "schedule-id",
      context: {
        launchId: "launch-id",
        previousScheduledAt: new Date("2026-07-20T14:00:00.000Z"),
        scheduledAt: new Date("2026-07-21T16:00:00.000Z"),
        previousResponsible: "Operacoes",
        responsible: "Suporte",
        previousStatus: "PLANNED",
        status: "RESCHEDULED"
      }
    });
    expect(result.status).toBe("RESCHEDULED");
  });

  it("rejects creation when launch context does not exist", async () => {
    launchModel.findById.mockResolvedValue(null);

    await expect(
      classScheduleService.create("operator-id", {
        launchId: "launch-id",
        title: "Aula 1",
        scheduledAt: "2026-07-20T14:00:00.000Z",
        responsible: "Operacoes",
        status: "PLANNED"
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Launch not found"
    });
  });

  it("deactivates a class schedule logically", async () => {
    classScheduleModel.findById.mockResolvedValue(buildClassSchedule());

    const result = await classScheduleService.deactivate("operator-id", "schedule-id");

    expect(classScheduleModel.updateOne).toHaveBeenCalledWith(
      { _id: "schedule-id" },
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
        action: "CLASS_SCHEDULE_DEACTIVATED",
        targetType: "CLASS_SCHEDULE",
        targetId: "schedule-id"
      })
    );
    expect(result.active).toBe(false);
    expect(result.deactivatedAt).toEqual(expect.any(Date));
  });
});
