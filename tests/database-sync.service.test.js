import { beforeEach, describe, expect, it, vi } from "vitest";

const accessSeedService = {
  ensureCoreAccessSeed: vi.fn()
};
const ensureDefaultSettings = vi.fn();

vi.mock("../src/services/access-seed.service.js", () => ({
  accessSeedService
}));

vi.mock("../src/services/platform-setting.service.js", () => ({
  ensureDefaultSettings
}));

const { DatabaseSyncService } = await import("../src/services/database-sync.service.js");

describe("DatabaseSyncService.sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates collections, indexes and applies default seeds", async () => {
    const models = [
      {
        modelName: "Launch",
        createCollection: vi.fn().mockResolvedValue(undefined),
        createIndexes: vi.fn().mockResolvedValue(undefined)
      },
      {
        modelName: "Role",
        createCollection: vi.fn().mockResolvedValue(undefined),
        createIndexes: vi.fn().mockResolvedValue(undefined)
      }
    ];

    const service = new DatabaseSyncService();
    const result = await service.sync({ models });

    expect(models[0].createCollection).toHaveBeenCalledOnce();
    expect(models[0].createIndexes).toHaveBeenCalledOnce();
    expect(models[1].createCollection).toHaveBeenCalledOnce();
    expect(models[1].createIndexes).toHaveBeenCalledOnce();
    expect(accessSeedService.ensureCoreAccessSeed).toHaveBeenCalledOnce();
    expect(ensureDefaultSettings).toHaveBeenCalledOnce();
    expect(result).toEqual({
      syncedModels: ["Launch", "Role"],
      syncedModelsCount: 2,
      accessSeedApplied: true,
      platformSettingsSeedApplied: true
    });
  });

  it("continues when a collection already exists", async () => {
    const models = [
      {
        modelName: "User",
        createCollection: vi.fn().mockRejectedValue({ code: 48 }),
        createIndexes: vi.fn().mockResolvedValue(undefined)
      }
    ];

    const service = new DatabaseSyncService();
    const result = await service.sync({ models });

    expect(models[0].createIndexes).toHaveBeenCalledOnce();
    expect(result.syncedModels).toEqual(["User"]);
  });
});
