import mongoose from "mongoose";
import { ZodError } from "zod";

export function errorMiddleware(error, _request, response, _next) {
  if (error instanceof ZodError) {
    response.status(400).json({
      message: "Validation error",
      details: error.flatten()
    });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    response.status(400).json({
      message: "Database validation error",
      details: Object.values(error.errors).map((item) => item.message)
    });
    return;
  }

  if (error?.code === 11000) {
    response.status(409).json({
      message: "A unique resource already exists"
    });
    return;
  }

  response.status(error?.statusCode ?? 500).json({
    message: error?.message ?? "Unexpected internal error"
  });
}
