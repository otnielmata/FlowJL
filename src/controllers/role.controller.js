import { z } from "zod";

import { roleService } from "../services/role.service.js";

const createRoleSchema = z.object({
  code: z.string().trim().min(2).max(40),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().min(5).max(255),
  active: z.boolean().optional()
});

const updateRoleSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().min(5).max(255),
  active: z.boolean()
});

class RoleController {
  async list(_request, response) {
    const roles = await roleService.list();

    response.status(200).json({
      items: roles
    });
  }

  async create(request, response) {
    const payload = createRoleSchema.parse(request.body);
    const role = await roleService.create(payload);

    response.status(201).json(role);
  }

  async update(request, response) {
    const payload = updateRoleSchema.parse(request.body);
    const role = await roleService.update(request.params.code, payload);

    response.status(200).json(role);
  }
}

export const roleController = new RoleController();
