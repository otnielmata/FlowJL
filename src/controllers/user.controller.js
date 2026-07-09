import { z } from "zod";

import { userService } from "../services/user.service.js";

const updateUserSchema = z
  .object({
    name: z.string().min(3).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    profile: z.string().min(1).optional(),
    active: z.boolean().optional()
  })
  .refine((data) => Object.keys(data).length > 0, "At least one field must be sent");

class UserController {
  async update(request, response) {
    const payload = updateUserSchema.parse(request.body);
    const user = await userService.update(request.params.id, payload);

    response.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      active: user.active,
      profile: user.profile
        ? {
            id: user.profile._id,
            name: user.profile.name,
            code: user.profile.code
          }
        : null
    });
  }
}

export const userController = new UserController();
