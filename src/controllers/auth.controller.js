import { z } from "zod";

import { authService } from "../services/auth.service.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

class AuthController {
  async login(request, response) {
    const payload = loginSchema.parse(request.body);
    const result = await authService.login(payload);
    response.status(200).json(result);
  }
}

export const authController = new AuthController();
