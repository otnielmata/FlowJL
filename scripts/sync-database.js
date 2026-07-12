import mongoose from "mongoose";

import { connectDatabase } from "../src/config/database.js";
import { databaseSyncService } from "../src/services/database-sync.service.js";

async function main() {
  await connectDatabase();

  const result = await databaseSyncService.sync();

  console.log(
    JSON.stringify(
      {
        status: "ok",
        ...result
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Failed to sync database", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
