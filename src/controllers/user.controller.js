import { z } from "zod";

import { userService } from "../services/user.service.js";

const createBootstrapAdminSchema = z.object({
  name: z.string().trim().min(3).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8)
});

const updateUserSchema = z
  .object({
    name: z.string().min(3).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    profile: z.string().min(1).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]).optional()
  })
  .refine((data) => Object.keys(data).length > 0, "At least one field must be sent");

class UserController {
  async createBootstrapAdmin(request, response) {
    const payload = createBootstrapAdminSchema.parse(request.body);
    const user = await userService.createBootstrapAdmin(payload);

    response.status(201).json(user);
  }

  async update(request, response) {
    const payload = updateUserSchema.parse(request.body);
    const user = await userService.update(request.params.id, payload);

    response.status(200).json(user);
  }
}

export const userController = new UserController();
