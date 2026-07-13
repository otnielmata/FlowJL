import { z } from "zod";

import { studentStatuses } from "../models/student.model.js";
import { studentService } from "../services/student.service.js";

const statusSchema = z.enum(studentStatuses);

const createStudentSchema = z.object({
  launchId: z.string().uuid().optional(),
  name: z.string().trim().min(3).max(160),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional(),
  product: z.string().trim().min(2).max(160),
  status: statusSchema,
  supportNotes: z.string().trim().max(1000).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).optional().default([])
});

const listStudentSchema = z.object({
  launchId: z.string().uuid().optional(),
  product: z.string().trim().min(2).max(160).optional(),
  status: statusSchema.optional(),
  email: z.string().trim().email().optional(),
  active: z.enum(["true", "false"]).transform((value) => value === "true").optional()
});

const updateStudentSchema = z
  .object({
    launchId: z.string().uuid().nullable().optional(),
    name: z.string().trim().min(3).max(160).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    product: z.string().trim().min(2).max(160).optional(),
    status: statusSchema.optional(),
    supportNotes: z.string().trim().max(1000).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(60)).max(20).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be informed"
  });

const paramsSchema = z.object({
  studentId: z.string().uuid()
});

class StudentController {
  async create(request, response) {
    const payload = createStudentSchema.parse(request.body);
    const student = await studentService.create(request.auth.sub, payload);

    response.status(201).json(student);
  }

  async list(request, response) {
    const filters = listStudentSchema.parse(request.query);
    const students = await studentService.list(filters);

    response.status(200).json(students);
  }

  async getById(request, response) {
    const { studentId } = paramsSchema.parse(request.params);
    const student = await studentService.getById(studentId);

    response.status(200).json(student);
  }

  async update(request, response) {
    const { studentId } = paramsSchema.parse(request.params);
    const payload = updateStudentSchema.parse(request.body);
    const student = await studentService.update(request.auth.sub, studentId, payload);

    response.status(200).json(student);
  }

  async deactivate(request, response) {
    const { studentId } = paramsSchema.parse(request.params);
    const student = await studentService.deactivate(request.auth.sub, studentId);

    response.status(200).json(student);
  }
}

export const studentController = new StudentController();
