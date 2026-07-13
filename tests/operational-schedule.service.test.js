import { beforeEach, describe, expect, it, vi } from "vitest";

const operationalScheduleModel = {
  bulkWrite: vi.fn(),
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  updateOne: vi.fn()
};

const launchModel = { findById: vi.fn() };
const classScheduleModel = { findById: vi.fn() };
const liveEventModel = { findById: vi.fn() };
const operationalChecklistModel = { findById: vi.fn() };
const auditServiceMock = { record: vi.fn() };

vi.mock("../src/models/operational-schedule.model.js", () => ({
  OperationalSchedule: operationalScheduleModel,
  operationalScheduleViews: ["MONTH", "WEEK", "DAY", "LIST", "KANBAN", "TIMELINE"],
  operationalScheduleAreas: ["OPERATIONS", "CONTENT", "SOCIAL_MEDIA", "TRAFFIC", "DESIGN", "COPY", "SALES", "LAUNCH"],
  operationalSchedulePriorities: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  operationalScheduleStatuses: ["BACKLOG", "PLANNED", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE", "CANCELED"],
  operationalScheduleTypes: ["TASK", "MEETING", "APPROVAL", "DELIVERY", "PUBLISHING", "AUTOMATION"],
  operationalScheduleRecurrenceFrequencies: ["NONE", "DAILY", "WEEKLY", "MONTHLY"]
}));
vi.mock("../src/models/launch.model.js", () => ({ Launch: launchModel }));
vi.mock("../src/models/class-schedule.model.js", () => ({ ClassSchedule: classScheduleModel }));
vi.mock("../src/models/live-event.model.js", () => ({ LiveEvent: liveEventModel }));
vi.mock("../src/models/operational-checklist.model.js", () => ({ OperationalChecklist: operationalChecklistModel }));
vi.mock("../src/services/audit.service.js", () => ({ auditService: auditServiceMock }));

const { operationalScheduleService } = await import("../src/services/operational-schedule.service.js");

function buildSchedule(overrides = {}) {
  return {
    id: "activity-1",
    launchId: "launch-1",
    title: "Preparar roteiro da live",
    description: "Roteiro principal e CTA",
    area: "CONTENT",
    priority: "HIGH",
    status: "PLANNED",
    type: "TASK",
    responsible: "Ana",
    startsAt: new Date("2026-07-18T13:00:00.000Z"),
    dueAt: new Date("2026-07-18T15:00:00.000Z"),
    timelinePosition: 2,
    dependencyIds: [],
    checklist: [
      {
        id: "check-1",
        label: "Briefing alinhado",
        required: true,
        completed: true,
        completedBy: "user-1",
        completedAt: new Date("2026-07-17T12:00:00.000Z")
      },
      {
        id: "check-2",
        label: "Oferta revisada",
        required: true,
        completed: false,
        completedBy: null,
        completedAt: null
      }
    ],
    attachments: [{ id: "att-1", name: "briefing.pdf", url: "https://files.example/briefing.pdf", mediaType: "application/pdf" }],
    comments: [{ id: "comment-1", authorUserId: "user-9", authorName: "Bia", message: "Priorizar CTA final", createdAt: new Date("2026-07-17T15:00:00.000Z") }],
    tags: ["live", "oferta"],
    active: true,
    createdAt: new Date("2026-07-17T11:00:00.000Z"),
    updatedAt: new Date("2026-07-17T11:00:00.000Z"),
    createdBy: "user-1",
    updatedBy: "user-1",
    toObject() {
      return { ...this };
    },
    ...overrides
  };
}

function mockSortedFindValue(model, value) {
  model.find.mockReturnValue({
    sort: vi.fn().mockResolvedValue(value)
  });
}

describe("operationalScheduleService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    launchModel.findById.mockResolvedValue({ id: "launch-1", active: true });
    classScheduleModel.findById.mockResolvedValue({ id: "class-1", active: true, launchId: "launch-1" });
    liveEventModel.findById.mockResolvedValue({ id: "live-1", active: true, launchId: "launch-1" });
    operationalChecklistModel.findById.mockResolvedValue({ id: "checklist-1", active: true });
    auditServiceMock.record.mockResolvedValue(undefined);
    operationalScheduleModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    operationalScheduleModel.bulkWrite.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  });

  it("creates an operational activity with detail structures and audit trail", async () => {
    operationalScheduleModel.create.mockResolvedValue(buildSchedule());
    mockSortedFindValue(operationalScheduleModel, []);

    const result = await operationalScheduleService.create("user-1", {
      launchId: "launch-1",
      title: " Preparar roteiro da live ",
      description: " Roteiro principal e CTA ",
      area: "CONTENT",
      priority: "HIGH",
      status: "PLANNED",
      type: "TASK",
      responsible: " Ana ",
      startsAt: "2026-07-18T13:00:00.000Z",
      dueAt: "2026-07-18T15:00:00.000Z",
      timelinePosition: 2,
      checklist: [{ label: "Briefing alinhado", required: true, completed: true }],
      attachments: [{ name: "briefing.pdf", url: "https://files.example/briefing.pdf", mediaType: "application/pdf" }],
      comments: [{ authorUserId: "user-9", authorName: "Bia", message: "Priorizar CTA final", createdAt: "2026-07-17T15:00:00.000Z" }],
      tags: [" live ", " oferta "]
    });

    expect(launchModel.findById).toHaveBeenCalledWith("launch-1");
    expect(operationalScheduleModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        launchId: "launch-1",
        title: "Preparar roteiro da live",
        description: "Roteiro principal e CTA",
        responsible: "Ana",
        tags: ["live", "oferta"],
        active: true
      })
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OPERATIONAL_SCHEDULE_CREATED",
        targetId: "activity-1"
      })
    );
    expect(result.attachments).toHaveLength(1);
    expect(result.comments).toHaveLength(1);
  });

  it("creates an operational activity with recurrence, reminders and relationships", async () => {
    operationalScheduleModel.create.mockResolvedValue(
      buildSchedule({
        recurrence: {
          frequency: "WEEKLY",
          interval: 1,
          count: 4,
          until: new Date("2026-08-30T00:00:00.000Z")
        },
        reminder: {
          enabled: true,
          remindAt: new Date("2026-07-18T12:00:00.000Z"),
          channel: "EMAIL"
        },
        relationships: {
          checklistId: "checklist-1",
          classScheduleId: "class-1",
          liveEventId: "live-1",
          relatedLink: "https://meet.example/ops"
        },
        attendance: {
          present: false,
          checkedBy: null,
          checkedAt: null
        },
        executionHistory: []
      })
    );
    mockSortedFindValue(operationalScheduleModel, []);

    const result = await operationalScheduleService.create("user-1", {
      launchId: "launch-1",
      title: "Operacao recorrente",
      area: "OPERATIONS",
      priority: "CRITICAL",
      status: "PLANNED",
      type: "MEETING",
      responsible: "Ana",
      startsAt: "2026-07-18T13:00:00.000Z",
      dueAt: "2026-07-18T15:00:00.000Z",
      recurrence: {
        frequency: "WEEKLY",
        interval: 1,
        count: 4,
        until: "2026-08-30T00:00:00.000Z"
      },
      reminder: {
        enabled: true,
        remindAt: "2026-07-18T12:00:00.000Z",
        channel: "EMAIL"
      },
      relationships: {
        checklistId: "checklist-1",
        classScheduleId: "class-1",
        liveEventId: "live-1",
        relatedLink: "https://meet.example/ops"
      }
    });

    expect(result.recurrence.frequency).toBe("WEEKLY");
    expect(result.reminder.enabled).toBe(true);
    expect(result.relationships.classScheduleId).toBe("class-1");
  });

  it("lists activities with persisted filter context and kanban projection", async () => {
    const activity = buildSchedule();
    const conflicting = buildSchedule({
      id: "activity-2",
      title: "Revisar anuncios",
      area: "TRAFFIC",
      status: "IN_PROGRESS",
      startsAt: new Date("2026-07-18T13:00:00.000Z"),
      dueAt: new Date("2026-07-18T15:00:00.000Z")
    });
    mockSortedFindValue(operationalScheduleModel, [activity, conflicting]);

    const result = await operationalScheduleService.list({
      launchId: "launch-1",
      status: "PLANNED",
      view: "KANBAN"
    });

    expect(operationalScheduleModel.find).toHaveBeenCalledWith({
      launchId: "launch-1",
      status: "PLANNED",
      active: true
    });
    expect(result.view).toBe("KANBAN");
    expect(result.availableViews).toContain("TIMELINE");
    expect(result.projection.type).toBe("kanban");
    expect(result.summary.conflicting).toBeGreaterThanOrEqual(1);
  });

  it("returns activity detail with dependencies, checklist, attachments and comments", async () => {
    const activity = buildSchedule({ dependencyIds: ["activity-0"] });
    const dependency = buildSchedule({
      id: "activity-0",
      title: "Definir pauta",
      dueAt: new Date("2026-07-18T10:00:00.000Z")
    });
    operationalScheduleModel.findById.mockResolvedValue(activity);
    operationalScheduleModel.find
      .mockReturnValueOnce({
        sort: vi.fn().mockResolvedValue([dependency])
      })
      .mockReturnValueOnce({
        sort: vi.fn().mockResolvedValue([dependency, activity])
      });

    const result = await operationalScheduleService.getById("activity-1");

    expect(result.dependencies).toEqual([
      expect.objectContaining({
        id: "activity-0",
        title: "Definir pauta"
      })
    ]);
    expect(result.checklist).toHaveLength(2);
    expect(result.attachments).toHaveLength(1);
    expect(result.comments).toHaveLength(1);
  });

  it("updates an activity and preserves dependency rules", async () => {
    const dependency = buildSchedule({
      id: "activity-0",
      title: "Definir pauta",
      startsAt: new Date("2026-07-18T08:00:00.000Z"),
      dueAt: new Date("2026-07-18T10:00:00.000Z")
    });
    operationalScheduleModel.findById.mockResolvedValue(
      buildSchedule({
        dependencyIds: ["activity-0"],
        recurrence: { frequency: "NONE", interval: 1, count: null, until: null },
        reminder: { enabled: false, remindAt: null, channel: null },
        relationships: { checklistId: null, classScheduleId: null, liveEventId: null, relatedLink: null },
        attendance: { present: false, checkedBy: null, checkedAt: null },
        executionHistory: []
      })
    );
    mockSortedFindValue(operationalScheduleModel, [dependency]);

    const result = await operationalScheduleService.update("user-2", "activity-1", {
      status: "IN_PROGRESS",
      startsAt: "2026-07-18T10:30:00.000Z",
      dueAt: "2026-07-18T16:00:00.000Z",
      dependencyIds: ["activity-0"]
    });

    expect(operationalScheduleModel.updateOne).toHaveBeenCalledWith(
      { _id: "activity-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "IN_PROGRESS",
          updatedBy: "user-2"
        })
      })
    );
    expect(result.status).toBe("IN_PROGRESS");
  });

  it("records execution progress, attendance and completion history", async () => {
    const schedule = buildSchedule({
      status: "IN_PROGRESS",
      recurrence: { frequency: "NONE", interval: 1, count: null, until: null },
      reminder: { enabled: false, remindAt: null, channel: null },
      relationships: { checklistId: "checklist-1", classScheduleId: null, liveEventId: null, relatedLink: null },
      attendance: { present: false, checkedBy: null, checkedAt: null },
      executionHistory: []
    });
    operationalScheduleModel.findById.mockResolvedValue(schedule);
    operationalScheduleModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([schedule])
    });

    const result = await operationalScheduleService.recordExecution("user-7", "activity-1", {
      attendance: {
        present: true
      },
      checklist: [
        {
          id: "check-2",
          label: "Oferta revisada",
          required: true,
          completed: true
        }
      ],
      status: "DONE",
      complete: true
    });

    expect(operationalScheduleModel.updateOne).toHaveBeenCalledWith(
      { _id: "activity-1" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "DONE",
          updatedBy: "user-7"
        })
      })
    );
    expect(result.attendance.present).toBe(true);
    expect(result.executionHistory.at(-1)).toEqual(
      expect.objectContaining({
        actionType: "COMPLETED",
        toStatus: "DONE"
      })
    );
  });

  it("replans activities in batch and returns refreshed timeline projection", async () => {
    const dependency = buildSchedule({
      id: "activity-0",
      title: "Definir pauta",
      startsAt: new Date("2026-07-18T08:00:00.000Z"),
      dueAt: new Date("2026-07-18T10:00:00.000Z")
    });
    const activity = buildSchedule({ dependencyIds: ["activity-0"] });

    mockSortedFindValue(operationalScheduleModel, [activity]);
    operationalScheduleModel.findById.mockResolvedValue(activity);

    operationalScheduleModel.find
      .mockReturnValueOnce({
        sort: vi.fn().mockResolvedValue([activity])
      })
      .mockReturnValueOnce({
        sort: vi.fn().mockResolvedValue([dependency])
      })
      .mockReturnValueOnce({
        sort: vi.fn().mockResolvedValue([
          buildSchedule({
            dependencyIds: ["activity-0"],
            startsAt: new Date("2026-07-18T10:30:00.000Z"),
            dueAt: new Date("2026-07-18T16:00:00.000Z"),
            status: "IN_PROGRESS"
          })
        ])
      })
      .mockReturnValueOnce({
        sort: vi.fn().mockResolvedValue([dependency])
      });

    const result = await operationalScheduleService.replan("user-4", {
      view: "TIMELINE",
      filters: {
        status: "IN_PROGRESS"
      },
      items: [
        {
          activityId: "activity-1",
          startsAt: "2026-07-18T10:30:00.000Z",
          dueAt: "2026-07-18T16:00:00.000Z",
          status: "IN_PROGRESS",
          timelinePosition: 1,
          dependencyIds: ["activity-0"]
        }
      ]
    });

    expect(operationalScheduleModel.bulkWrite).toHaveBeenCalledWith([
      expect.objectContaining({
        updateOne: expect.objectContaining({
          filter: { _id: "activity-1" }
        })
      })
    ]);
    expect(auditServiceMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OPERATIONAL_SCHEDULE_REPLANNED"
      })
    );
    expect(result.message).toBe("Operational schedule replanned successfully");
    expect(result.projection.type).toBe("timeline");
    expect(result.confirmations).toHaveLength(1);
  });
});
