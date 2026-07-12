import { beforeEach, describe, expect, it, vi } from "vitest";

const studentModel = {
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  findOne: vi.fn(),
  updateOne: vi.fn()
};

const launchModel = {
  findById: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/student.model.js", () => ({
  Student: studentModel,
  studentStatuses: ["ACTIVE", "INACTIVE", "PENDING", "COMPLETED", "CANCELED"]
}));

vi.mock("../src/models/launch.model.js", () => ({
  Launch: launchModel
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

const { studentService } = await import("../src/services/student.service.js");

function buildStudent(overrides = {}) {
  return {
    id: "student-id",
    launchId: "launch-id",
    name: "Maria Silva",
    email: "maria@example.com",
    phone: "+55 11 99999-0000",
    product: "Mentoria JL",
    status: "ACTIVE",
    supportNotes: "Aluno VIP",
    tags: ["vip", "turma-1"],
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

describe("studentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditServiceMock.record.mockResolvedValue(undefined);
    studentModel.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  });

  it("creates a student with UUID-backed record and associated context", async () => {
    launchModel.findById.mockResolvedValue({ id: "launch-id", active: true });
    studentModel.findOne.mockResolvedValue(null);
    studentModel.create.mockResolvedValue(buildStudent());

    const result = await studentService.create("operator-id", {
      launchId: "launch-id",
      name: " Maria Silva ",
      email: " Maria@Example.com ",
      phone: " +55 11 99999-0000 ",
      product: " Mentoria JL ",
      status: "ACTIVE",
      supportNotes: " Aluno VIP ",
      tags: [" vip ", "turma-1", "vip"]
    });

    expect(studentModel.findOne).toHaveBeenCalledWith({
      email: "maria@example.com",
      product: "Mentoria JL",
      active: true
    });
    expect(studentModel.create).toHaveBeenCalledWith({
      launchId: "launch-id",
      name: "Maria Silva",
      email: "maria@example.com",
      phone: "+55 11 99999-0000",
      product: "Mentoria JL",
      status: "ACTIVE",
      supportNotes: "Aluno VIP",
      tags: ["vip", "turma-1"],
      active: true,
      deactivatedAt: null,
      createdBy: "operator-id",
      updatedBy: "operator-id"
    });
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "operator-id",
      action: "STUDENT_CREATED",
      targetType: "STUDENT",
      targetId: "student-id",
      context: {
        launchId: "launch-id",
        product: "Mentoria JL",
        status: "ACTIVE",
        email: "maria@example.com"
      }
    });
    expect(result.id).toBe("student-id");
  });

  it("lists and retrieves students without exposing inactive records by default", async () => {
    studentModel.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([buildStudent()])
    });
    studentModel.findById.mockResolvedValue(buildStudent());

    const listResult = await studentService.list({
      launchId: "launch-id",
      product: " Mentoria JL ",
      status: "ACTIVE",
      email: " Maria@Example.com "
    });
    const getResult = await studentService.getById("student-id");

    expect(studentModel.find).toHaveBeenCalledWith({
      launchId: "launch-id",
      product: "Mentoria JL",
      status: "ACTIVE",
      email: "maria@example.com",
      active: true
    });
    expect(listResult).toHaveLength(1);
    expect(getResult.id).toBe("student-id");
  });

  it("updates operational student information with audit trail", async () => {
    studentModel.findById.mockResolvedValue(buildStudent());
    studentModel.findOne.mockResolvedValue(null);

    const result = await studentService.update("operator-id", "student-id", {
      status: "PENDING",
      product: "Mentoria JL 2",
      supportNotes: "Aguardando onboarding"
    });

    expect(studentModel.updateOne).toHaveBeenCalledWith(
      { _id: "student-id" },
      {
        $set: {
          launchId: "launch-id",
          name: "Maria Silva",
          email: "maria@example.com",
          phone: "+55 11 99999-0000",
          product: "Mentoria JL 2",
          status: "PENDING",
          supportNotes: "Aguardando onboarding",
          tags: ["vip", "turma-1"],
          updatedBy: "operator-id"
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "operator-id",
      action: "STUDENT_UPDATED",
      targetType: "STUDENT",
      targetId: "student-id",
      context: {
        launchId: "launch-id",
        previousStatus: "ACTIVE",
        status: "PENDING",
        previousProduct: "Mentoria JL",
        product: "Mentoria JL 2"
      }
    });
    expect(result.status).toBe("PENDING");
  });

  it("rejects duplicate active student registration for the same product", async () => {
    studentModel.findOne.mockResolvedValue(buildStudent());

    await expect(
      studentService.create("operator-id", {
        name: "Maria Silva",
        email: "maria@example.com",
        product: "Mentoria JL",
        status: "ACTIVE"
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Student is already registered for this product"
    });
  });

  it("deactivates a student logically", async () => {
    studentModel.findById.mockResolvedValue(buildStudent());

    const result = await studentService.deactivate("operator-id", "student-id");

    expect(studentModel.updateOne).toHaveBeenCalledWith(
      { _id: "student-id" },
      {
        $set: {
          status: "INACTIVE",
          active: false,
          deactivatedAt: expect.any(Date),
          updatedBy: "operator-id"
        }
      }
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "STUDENT_DEACTIVATED",
        targetType: "STUDENT",
        targetId: "student-id"
      })
    );
    expect(result.active).toBe(false);
    expect(result.status).toBe("INACTIVE");
  });
});
