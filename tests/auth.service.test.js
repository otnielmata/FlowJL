import { beforeEach, describe, expect, it, vi } from "vitest";

const userModel = {
  findOne: vi.fn(),
  findById: vi.fn()
};

const authSessionModel = {
  create: vi.fn(),
  findById: vi.fn()
};

const bcryptMock = {
  compare: vi.fn(),
  hash: vi.fn()
};

const tokenServiceMock = {
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
  parseExpirationDate: vi.fn()
};

const auditServiceMock = {
  record: vi.fn()
};

vi.mock("../src/models/user.model.js", () => ({
  User: userModel
}));

vi.mock("../src/models/auth-session.model.js", () => ({
  AuthSession: authSessionModel
}));

vi.mock("bcryptjs", () => ({
  default: bcryptMock
}));

vi.mock("../src/services/token.service.js", () => ({
  tokenService: tokenServiceMock
}));

vi.mock("../src/services/audit.service.js", () => ({
  auditService: auditServiceMock
}));

process.env.JWT_SECRET = "change-this-secret";
process.env.JWT_EXPIRES_IN = "1d";
process.env.JWT_REFRESH_SECRET = "change-this-refresh-secret";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.BASE_URL = "http://localhost:3000";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/flow-jl-test";

const { authService } = await import("../src/services/auth.service.js");

function createUser(overrides = {}) {
  return {
    id: "user-1",
    name: "Admin Flow JL",
    email: "admin@flowjl.com",
    passwordHash: "stored-hash",
    status: "ACTIVE",
    roleId: { _id: "role-admin" },
    profile: null,
    createdAt: new Date("2026-07-10T00:00:00.000Z"),
    updatedAt: new Date("2026-07-10T00:00:00.000Z"),
    createdBy: null,
    updatedBy: null,
    lastLoginAt: null,
    deactivatedAt: null,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

function createQuery(result) {
  return {
    populate: vi.fn().mockReturnThis(),
    then: (resolve) => Promise.resolve(result).then(resolve)
  };
}

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenServiceMock.generateAccessToken.mockReturnValue("access-token");
    tokenServiceMock.generateRefreshToken.mockReturnValue("refresh-token");
    tokenServiceMock.parseExpirationDate.mockReturnValue(new Date("2026-07-17T00:00:00.000Z"));
    auditServiceMock.record.mockResolvedValue(undefined);
  });

  it("logs in an active user with normalized email and rotates session tokens", async () => {
    const user = createUser();
    userModel.findOne.mockReturnValue(createQuery(user));
    bcryptMock.compare.mockResolvedValue(true);
    bcryptMock.hash.mockResolvedValue("hashed-refresh-token");

    const result = await authService.login({
      email: " Admin@FlowJL.com ",
      password: "Admin@123"
    });

    expect(userModel.findOne).toHaveBeenCalledWith({ email: "admin@flowjl.com" });
    expect(bcryptMock.compare).toHaveBeenCalledWith("Admin@123", "stored-hash");
    expect(user.save).toHaveBeenCalled();
    expect(authSessionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        refreshTokenHash: "hashed-refresh-token",
        expiresAt: new Date("2026-07-17T00:00:00.000Z")
      })
    );
    expect(auditServiceMock.record).toHaveBeenCalledWith({
      actorUserId: "user-1",
      action: "USER_AUTHENTICATED",
      targetType: "USER",
      targetId: "user-1",
      context: {
        sessionId: expect.any(String)
      }
    });
    expect(result).toMatchObject({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: {
        id: "user-1",
        email: "admin@flowjl.com",
        status: "ACTIVE",
        roleId: "role-admin"
      }
    });
  });

  it("rejects invalid credentials with a generic message", async () => {
    const user = createUser();
    userModel.findOne.mockReturnValue(createQuery(user));
    bcryptMock.compare.mockResolvedValue(false);

    await expect(
      authService.login({
        email: "admin@flowjl.com",
        password: "wrong-pass"
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid credentials"
    });
  });

  it("blocks login for inactive or pending users", async () => {
    const user = createUser({ status: "INACTIVE" });
    userModel.findOne.mockReturnValue(createQuery(user));
    bcryptMock.compare.mockResolvedValue(true);

    await expect(
      authService.login({
        email: "admin@flowjl.com",
        password: "Admin@123"
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Access is not allowed"
    });
  });

  it("refreshes an active session and rotates the refresh token", async () => {
    const session = {
      id: "session-1",
      revokedAt: null,
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      refreshTokenHash: "stored-refresh-hash",
      save: vi.fn().mockResolvedValue(undefined)
    };
    const user = createUser();

    tokenServiceMock.verifyRefreshToken.mockReturnValue({
      type: "refresh",
      sub: "user-1",
      sessionId: "session-1"
    });
    authSessionModel.findById.mockResolvedValue(session);
    bcryptMock.compare.mockResolvedValue(true);
    bcryptMock.hash.mockResolvedValue("next-refresh-hash");
    userModel.findById.mockReturnValue(createQuery(user));

    const result = await authService.refreshSession({ refreshToken: "refresh-token" });

    expect(authSessionModel.findById).toHaveBeenCalledWith("session-1");
    expect(session.save).toHaveBeenCalled();
    expect(result).toMatchObject({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: {
        id: "user-1"
      }
    });
  });

  it("revokes a session on logout", async () => {
    const session = {
      revokedAt: null,
      refreshTokenHash: "stored-refresh-hash",
      save: vi.fn().mockResolvedValue(undefined)
    };

    tokenServiceMock.verifyRefreshToken.mockReturnValue({
      type: "refresh",
      sessionId: "session-1"
    });
    authSessionModel.findById.mockResolvedValue(session);
    bcryptMock.compare.mockResolvedValue(true);

    const result = await authService.logout({ refreshToken: "refresh-token" });

    expect(session.revokedAt).toBeInstanceOf(Date);
    expect(session.save).toHaveBeenCalled();
    expect(result).toEqual({
      message: "Session terminated successfully"
    });
  });

  it("returns the authenticated user without passwordHash", async () => {
    const user = createUser();
    userModel.findById.mockReturnValue(createQuery(user));

    const result = await authService.getAuthenticatedUser({ sub: "user-1" });

    expect(result).toMatchObject({
      id: "user-1",
      email: "admin@flowjl.com",
      status: "ACTIVE",
      roleId: "role-admin"
    });
    expect(result).not.toHaveProperty("passwordHash");
  });
});
