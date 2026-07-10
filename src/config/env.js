import "dotenv/config";

import { z } from "zod";

const optionalEnvString = (value) => {
  if (value == null || value === "") {
    return undefined;
  }

  return value;
};

const envSchema = z.object({
  NODE_ENV: z.preprocess(optionalEnvString, z.enum(["development", "test", "production"]).default("development")),
  PORT: z.preprocess(optionalEnvString, z.coerce.number().default(3000)),
  BASE_URL: z.preprocess(optionalEnvString, z.string().url().default("http://localhost:3000")),
  MONGODB_URI: z.preprocess(optionalEnvString, z.string().min(1).default("mongodb://127.0.0.1:27017/flow-jl")),
  JWT_SECRET: z.preprocess(optionalEnvString, z.string().min(10).default("change-this-secret")),
  JWT_EXPIRES_IN: z.preprocess(optionalEnvString, z.string().default("1d"))
});

export const env = envSchema.parse(process.env);
