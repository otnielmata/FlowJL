import { beforeEach, describe, expect, it, vi } from "vitest";

const launchModel = {
  findById: vi.fn()
};

const operationalChecklistModel = {
  find: vi.fn()
};

const classScheduleModel = {
  find: vi.fn()
};

const liveEventModel = {
  find: vi.fn()
};

const operationalScheduleService = {
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  recordExecution: vi.fn()
};

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/models/operational-checklist.model.js", () => ({
  OperationalChecklist: operationalChecklistModel
}));

vi.mock("../src/models/class-schedule.model.js", () => ({
  ClassSchedule: classScheduleModel
}));

vi.mock("../src/models/live-event.model.js", () => ({
  LiveEvent: liveEventModel
}));

vi.mock("../src/services/operational-schedule.service.js", () => ({
  operationalScheduleService
}));

const { operationsManagementService } = await import("../src/services/operations-management.service.js");

describe("operationsManagementService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aggregates operational activities with related context", async () => {
    operationalScheduleService.list.mockResolvedValue({
      projection: {
        type: "list",
        items: []
      },
      availableViews: ["LIST", "KANBAN"],
      items: [
        {
          id: "activity-1",
          launchId: "launch-1",
          title: "Mentoria ao vivo",
          startsAt: new Date("2026-07-20T10:00:00.000Z"),
          dueAt: new Date("2026-07-20T11:00:00.000Z"),
          status: "PLANNED",
          priority: "CRITICAL",
          state: "HEALTHY",
          relationships: {
            checklistId: "checklist-1",
            classScheduleId: "class-1",
            liveEventId: "live-1"
          }
        },
        {
          id: "activity-2",
          launchId: "launch-1",
          title: "Checklist atrasado",
          startsAt: new Date("2026-07-10T10:00:00.000Z"),
          dueAt: new Date("2026-07-10T11:00:00.000Z"),
          status: "BLOCKED",
          priority: "HIGH",
          state: "DELAYED",
          relationships: {
            checklistId: null,
            classScheduleId: null,
            liveEventId: null
          }
        }
      ]
    });
    launchModel.findById.mockResolvedValue({
      id: "launch-1",
      name: "Lancamento A",
      expert: "Expert A",
      product: "Produto A",
      active: true
    });
    operationalChecklistModel.find.mockResolvedValue([
      {
        id: "checklist-1",
        title: "Checklist principal",
        status: "OPEN",
        items: [],
        active: true
      }
    ]);
    classScheduleModel.find.mockResolvedValue([
      {
        id: "class-1",
        title: "Aula 1",
        scheduledAt: new Date("2026-07-20T10:00:00.000Z"),
        responsible: "Ana",
        status: "PLANNED"
      }
    ]);
    liveEventModel.find.mockResolvedValue([
      {
        id: "live-1",
        name: "Live 1",
        scheduledAt: new Date("2026-07-20T10:00:00.000Z"),
        responsible: "Ana",
        status: "PLANNED",
        channel: "YOUTUBE"
      }
    ]);

    const result = await operationsManagementService.list({
      view: "LIST"
    });

    expect(result.summary).toEqual(
      expect.objectContaining({
        total: 2,
        delayed: 1,
        pending: 2,
        critical: 1
      })
    );
    expect(result.items[0].context.launch.name).toBe("Lancamento A");
    expect(result.items[0].context.classSchedule.title).toBe("Aula 1");
    expect(result.items[0].context.liveEvent.name).toBe("Live 1");
  });

  it("delegates create and execution flows to the operational schedule service", async () => {
    operationalScheduleService.create.mockResolvedValue({ id: "activity-10" });
    operationalScheduleService.recordExecution.mockResolvedValue({ id: "activity-10", status: "DONE" });

    const created = await operationsManagementService.createActivity("user-1", { launchId: "launch-1", title: "Nova atividade" });
    const executed = await operationsManagementService.recordExecution("user-1", "activity-10", { status: "DONE" });

    expect(created.id).toBe("activity-10");
    expect(executed.status).toBe("DONE");
    expect(operationalScheduleService.create).toHaveBeenCalled();
    expect(operationalScheduleService.recordExecution).toHaveBeenCalledWith("user-1", "activity-10", { status: "DONE" });
  });
});
