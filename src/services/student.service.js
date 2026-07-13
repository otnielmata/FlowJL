import { Launch } from "../models/launch.model.js";
import { Student } from "../models/student.model.js";
import { auditService } from "./audit.service.js";

function normalizeString(value) {
  return value?.trim() ?? null;
}

function normalizeTags(tags = []) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function toPublicStudent(student) {
  return {
    id: student.id,
    launchId: student.launchId ?? null,
    name: student.name,
    email: student.email,
    phone: student.phone ?? null,
    product: student.product,
    status: student.status,
    supportNotes: student.supportNotes ?? null,
    tags: [...(student.tags ?? [])],
    active: student.active,
    deactivatedAt: student.deactivatedAt ?? null,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
    createdBy: student.createdBy ?? null,
    updatedBy: student.updatedBy ?? null
  };
}

async function ensureLaunchExists(launchId) {
  if (!launchId) {
    return;
  }

  const launch = await Launch.findById(launchId);

  if (!launch || launch.active === false) {
    throw {
      statusCode: 404,
      message: "Launch not found"
    };
  }
}

class StudentService {
  async create(authenticatedUserId, data) {
    const launchId = data.launchId ?? null;
    await ensureLaunchExists(launchId);

    const email = data.email.trim().toLowerCase();
    const product = data.product.trim();
    const existingStudent = await Student.findOne({ email, product, active: true });

    if (existingStudent) {
      throw {
        statusCode: 409,
        message: "Student is already registered for this product"
      };
    }

    const student = await Student.create({
      launchId,
      name: data.name.trim(),
      email,
      phone: normalizeString(data.phone),
      product,
      status: data.status,
      supportNotes: normalizeString(data.supportNotes),
      tags: normalizeTags(data.tags),
      active: true,
      deactivatedAt: null,
      createdBy: authenticatedUserId,
      updatedBy: authenticatedUserId
    });

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "STUDENT_CREATED",
      targetType: "STUDENT",
      targetId: student.id,
      context: {
        launchId: student.launchId ?? null,
        product: student.product,
        status: student.status,
        email: student.email
      }
    });

    return toPublicStudent(student);
  }

  async list(filters = {}) {
    const query = {};

    if (filters.launchId) {
      query.launchId = filters.launchId;
    }

    if (filters.product) {
      query.product = filters.product.trim();
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.email) {
      query.email = filters.email.trim().toLowerCase();
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    } else {
      query.active = true;
    }

    const students = await Student.find(query).sort({ name: 1, createdAt: -1 });
    return students.map((student) => toPublicStudent(student));
  }

  async getById(studentId) {
    const student = await Student.findById(studentId);

    if (!student) {
      throw {
        statusCode: 404,
        message: "Student not found"
      };
    }

    return toPublicStudent(student);
  }

  async update(authenticatedUserId, studentId, data) {
    const student = await Student.findById(studentId);

    if (!student || !student.active) {
      throw {
        statusCode: 404,
        message: "Student not found"
      };
    }

    if (data.launchId !== undefined) {
      await ensureLaunchExists(data.launchId);
    }

    const updates = {
      launchId: data.launchId !== undefined ? data.launchId : student.launchId ?? null,
      name: data.name?.trim() ?? student.name,
      email: data.email ? data.email.trim().toLowerCase() : student.email,
      phone: data.phone !== undefined ? normalizeString(data.phone) : student.phone,
      product: data.product?.trim() ?? student.product,
      status: data.status ?? student.status,
      supportNotes: data.supportNotes !== undefined ? normalizeString(data.supportNotes) : student.supportNotes,
      tags: data.tags !== undefined ? normalizeTags(data.tags) : student.tags,
      updatedBy: authenticatedUserId
    };

    if ((updates.email !== student.email || updates.product !== student.product) && updates.active !== false) {
      const duplicateStudent = await Student.findOne({
        _id: { $ne: studentId },
        email: updates.email,
        product: updates.product,
        active: true
      });

      if (duplicateStudent) {
        throw {
          statusCode: 409,
          message: "Student is already registered for this product"
        };
      }
    }

    await Student.updateOne(
      { _id: studentId },
      {
        $set: updates
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "STUDENT_UPDATED",
      targetType: "STUDENT",
      targetId: student.id,
      context: {
        launchId: updates.launchId ?? null,
        previousStatus: student.status,
        status: updates.status,
        previousProduct: student.product,
        product: updates.product
      }
    });

    return toPublicStudent({
      ...student.toObject(),
      ...updates,
      id: student.id,
      updatedAt: new Date()
    });
  }

  async deactivate(authenticatedUserId, studentId) {
    const student = await Student.findById(studentId);

    if (!student) {
      throw {
        statusCode: 404,
        message: "Student not found"
      };
    }

    if (!student.active) {
      throw {
        statusCode: 409,
        message: "Student is already inactive"
      };
    }

    const deactivatedAt = new Date();

    await Student.updateOne(
      { _id: studentId },
      {
        $set: {
          status: "INACTIVE",
          active: false,
          deactivatedAt,
          updatedBy: authenticatedUserId
        }
      }
    );

    await auditService.record({
      actorUserId: authenticatedUserId,
      action: "STUDENT_DEACTIVATED",
      targetType: "STUDENT",
      targetId: student.id,
      context: {
        launchId: student.launchId ?? null,
        product: student.product,
        previousStatus: student.status,
        status: "INACTIVE"
      }
    });

    return toPublicStudent({
      ...student.toObject(),
      id: student.id,
      status: "INACTIVE",
      active: false,
      deactivatedAt,
      updatedBy: authenticatedUserId
    });
  }
}

export const studentService = new StudentService();
export { toPublicStudent };
