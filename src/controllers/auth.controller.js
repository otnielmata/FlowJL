import { z } from "zod";

import { authService } from "../services/auth.service.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

class AuthController {
  async login(request, response) {
    const payload = loginSchema.parse(request.body);
    const result = await authService.login(payload);
    response.status(200).json(result);
  }

  async refresh(request, response) {
    const payload = refreshTokenSchema.parse(request.body);
    const result = await authService.refreshSession(payload);
    response.status(200).json(result);
  }

  async logout(request, response) {
    const payload = refreshTokenSchema.parse(request.body);
    const result = await authService.logout(payload);
    response.status(200).json(result);
  }

  async me(request, response) {
    const result = await authService.getAuthenticatedUser(request.auth);
    response.status(200).json(result);
  }
}

export const authController = new AuthController();
