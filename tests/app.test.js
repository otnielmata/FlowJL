import request from "supertest";
import { describe, expect, it } from "vitest";

process.env.BASE_URL = "http://localhost:3000";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/flow-jl-test";
process.env.JWT_SECRET = "change-this-secret";

const { app } = await import("../src/app.js");

describe("app", () => {
  it("should expose the health endpoint", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("flow-jl-api");
    expect(response.body.status).toBe("ok");
  });

  it("should expose the api root endpoint", async () => {
    const response = await request(app).get("/api/v1");

    expect(response.status).toBe(200);
    expect(response.body.modules).toContain("audits");
    expect(response.body.modules).toContain("auth");
    expect(response.body.modules).toContain("launches");
    expect(response.body.modules).toContain("roles");
    expect(response.body.modules).toContain("profiles");
    expect(response.body.modules).toContain("class-schedules");
    expect(response.body.modules).toContain("youtube-contents");
    expect(response.body.modules).toContain("copywritings");
    expect(response.body.modules).toContain("content-approvals");
    expect(response.body.modules).toContain("content-statuses");
    expect(response.body.modules).toContain("assets");
    expect(response.body.modules).toContain("publications");
    expect(response.body.modules).toContain("editorial-calendar");
    expect(response.body.modules).toContain("production-checklists");
    expect(response.body.modules).toContain("external-publication");
    expect(response.body.modules).toContain("traffic-audiences");
    expect(response.body.modules).toContain("traffic-campaigns");
    expect(response.body.modules).toContain("traffic-conversion-events");
    expect(response.body.modules).toContain("traffic-creatives");
    expect(response.body.modules).toContain("traffic-pixels");
    expect(response.body.modules).toContain("traffic-reports");
    expect(response.body.modules).toContain("traffic-roi");
  });
});
