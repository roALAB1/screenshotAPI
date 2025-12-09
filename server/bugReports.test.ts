import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module
vi.mock("./db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
}));

// Mock storage module
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://example.com/screenshot.png", key: "test-key" }),
  storageGet: vi.fn().mockResolvedValue({ url: "https://example.com/screenshot.png", key: "test-key" }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Bug Reports API", () => {
  describe("bugReports.submit", () => {
    it("should validate required fields", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // Should throw error when projectKey is missing
      await expect(
        caller.bugReports.submit({
          projectKey: "",
          pageUrl: "https://example.com",
        })
      ).rejects.toThrow();
    });

    it("should accept valid bug report data", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // Mock the database to return a project
      const { db } = await import("./db");
      vi.mocked(db.select).mockReturnThis();
      vi.mocked(db.from).mockReturnThis();
      vi.mocked(db.where).mockResolvedValueOnce([
        { id: 1, projectKey: "test-project-key", name: "Test Project", ownerId: 1 },
      ]);
      vi.mocked(db.insert).mockReturnThis();
      vi.mocked(db.values).mockResolvedValueOnce([{ insertId: 1 }]);

      const result = await caller.bugReports.submit({
        projectKey: "test-project-key",
        pageUrl: "https://example.com/page",
        title: "Test Bug",
        description: "Test description",
        consoleLogs: [
          { type: "error", message: "Test error", timestamp: Date.now() },
        ],
        networkLogs: [
          {
            method: "GET",
            url: "https://api.example.com/data",
            status: 500,
            statusText: "Internal Server Error",
            requestHeaders: {},
            responseHeaders: {},
            startTime: 0,
            duration: 100,
            size: 0,
            type: "json",
          },
        ],
        deviceInfo: {
          userAgent: "Mozilla/5.0",
          platform: "MacIntel",
          language: "en-US",
          screenWidth: 1920,
          screenHeight: 1080,
          viewportWidth: 1920,
          viewportHeight: 900,
          devicePixelRatio: 2,
          timezone: "America/New_York",
          cookiesEnabled: true,
        },
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("id");
    });
  });

  describe("bugReports.list", () => {
    it("should require authentication", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.bugReports.list({})).rejects.toThrow("Please login");
    });

    it("should return empty list when user has no projects", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Mock empty projects
      const { db } = await import("./db");
      vi.mocked(db.select).mockReturnThis();
      vi.mocked(db.from).mockReturnThis();
      vi.mocked(db.where).mockResolvedValueOnce([]);

      const result = await caller.bugReports.list({});

      expect(result).toEqual({ reports: [], total: 0 });
    });
  });

  describe("bugReports.stats", () => {
    it("should require authentication", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.bugReports.stats()).rejects.toThrow("Please login");
    });

    it("should return zero stats when user has no projects", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Mock empty projects
      const { db } = await import("./db");
      vi.mocked(db.select).mockReturnThis();
      vi.mocked(db.from).mockReturnThis();
      vi.mocked(db.where).mockResolvedValueOnce([]);

      const result = await caller.bugReports.stats();

      expect(result).toEqual({
        total: 0,
        new: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
      });
    });
  });
});

describe("Projects API", () => {
  describe("projects.create", () => {
    it("should require authentication", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.projects.create({ name: "Test Project" })
      ).rejects.toThrow("Please login");
    });

    it("should create a project with valid data", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Mock database insert
      const { db } = await import("./db");
      vi.mocked(db.insert).mockReturnThis();
      vi.mocked(db.values).mockResolvedValueOnce([{ insertId: 1 }]);

      const result = await caller.projects.create({
        name: "Test Project",
        description: "Test description",
      });

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("projectKey");
      expect(result.projectKey).toHaveLength(12); // nanoid default length
    });
  });

  describe("projects.list", () => {
    it("should require authentication", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.projects.list()).rejects.toThrow("Please login");
    });
  });

  describe("projects.getByKey", () => {
    it("should be accessible without authentication", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // Mock project lookup
      const { db } = await import("./db");
      vi.mocked(db.select).mockReturnThis();
      vi.mocked(db.from).mockReturnThis();
      vi.mocked(db.where).mockResolvedValueOnce([
        { id: 1, projectKey: "test-key-123", name: "Test Project" },
      ]);

      const result = await caller.projects.getByKey({ projectKey: "test-key-123" });

      expect(result).toHaveProperty("id", 1);
      expect(result).toHaveProperty("name", "Test Project");
    });

    it("should throw NOT_FOUND for invalid project key", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // Mock empty result
      const { db } = await import("./db");
      vi.mocked(db.select).mockReturnThis();
      vi.mocked(db.from).mockReturnThis();
      vi.mocked(db.where).mockResolvedValueOnce([]);

      await expect(
        caller.projects.getByKey({ projectKey: "invalid-key" })
      ).rejects.toThrow("Project not found");
    });
  });
});
