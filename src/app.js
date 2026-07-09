import express from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";
import { apiRoutes } from "./routes/index.js";

const swaggerDocument = YAML.load(new URL("../docs/swagger.yaml", import.meta.url).pathname);

export const app = express();

app.use(express.json());

app.get("/health", (_request, response) => {
  response.status(200).json({
    name: "flow-jl-api",
    status: "ok",
    baseUrl: env.BASE_URL,
    timestamp: new Date().toISOString()
  });
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api/v1", apiRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
