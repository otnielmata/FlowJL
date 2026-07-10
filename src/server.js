import { app } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { accessSeedService } from "./services/access-seed.service.js";

async function bootstrap() {
  await connectDatabase();
  await accessSeedService.ensureCoreAccessSeed();

  app.listen(env.PORT, () => {
    console.log(`flow-jl-api running on port ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start flow-jl-api", error);
  process.exit(1);
});
