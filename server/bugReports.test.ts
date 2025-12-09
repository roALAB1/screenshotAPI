import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module with proper factory
vi.mock("./db", () => {
  const mockDb = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    groupBy: vi.fn(),
    insert: vi.fn(),
    values: vi.fn(),
    update: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };
  
  // Setup chainable mock
  mockDb.select.mockReturnValue(mockDb);
  mockDb.from.mockReturnValue(mockDb);
  mockDb.where.mockReturnValue(mockDb);
  mockDb.orderBy.mockReturnValue(mockDb);
  mockDb.limit.mockReturnValue(mockDb);
  mockDb.offset.mockReturnValue(mockDb);
  mockDb.groupBy.mockReturnValue(mockDb);
  mockDb.insert.mockReturnValue(mockDb);
  mockDb.update.mockReturnValue(mockDb);
  mockDb.set.mockReturnValue(mockDb);
  mockDb.delete.mockReturnValue(mockDb);
  mockDb.values.mockResolvedValue([{ insertId: 1 }]);
  
  return { db: mockDb };
});

// Mock storage module
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://example.com/screenshot.png", key: "test-key" }),
  storageGet: vi.fn().mockResolvedValue({ url: "https://example.com/screenshot.png", key: "test-key" }),
}));

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
  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-setup mock chain after clearing
    const { db } = await import("./db");
    vi.mocked(db.select).mockReturnValue(db);
    vi.mocked(db.from).mockReturnValue(db);
    vi.mocked(db.where).mockReturnValue(db);
    vi.mocked(db.orderBy).mockReturnValue(db);
    vi.mocked(db.limit).mockReturnValue(db);
    vi.mocked(db.offset).mockReturnValue(db);
    vi.mocked(db.groupBy).mockReturnValue(db);
    vi.mocked(db.insert).mockReturnValue(db);
    vi.mocked(db.update).mockReturnValue(db);
    vi.mocked(db.set).mockReturnValue(db);
    vi.mocked(db.delete).mockReturnValue(db);
    vi.mocked(db.values).mockResolvedValue([{ insertId: 1 }]);
  });

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

      // Mock the database to return a project on first where call
      const { db } = await import("./db");
      vi.mocked(db.where).mockResolvedValueOnce([
        { id: 1, projectKey: "test-project-key", name: "Test Project" },
      ]);
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
    it("should return reports list (no auth required)", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // Mock database to return empty reports
      const { db } = await import("./db");
      vi.mocked(db.offset).mockResolvedValueOnce([]);

      const result = await caller.bugReports.list({});

      expect(result).toHaveProperty("reports");
      expect(result).toHaveProperty("total");
    });
  });
});

describe("Projects API", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-setup mock chain after clearing
    const { db } = await import("./db");
    vi.mocked(db.select).mockReturnValue(db);
    vi.mocked(db.from).mockReturnValue(db);
    vi.mocked(db.where).mockReturnValue(db);
    vi.mocked(db.orderBy).mockReturnValue(db);
    vi.mocked(db.limit).mockReturnValue(db);
    vi.mocked(db.offset).mockReturnValue(db);
    vi.mocked(db.groupBy).mockReturnValue(db);
    vi.mocked(db.insert).mockReturnValue(db);
    vi.mocked(db.update).mockReturnValue(db);
    vi.mocked(db.set).mockReturnValue(db);
    vi.mocked(db.delete).mockReturnValue(db);
    vi.mocked(db.values).mockResolvedValue([{ insertId: 1 }]);
  });

  describe("projects.create", () => {
    it("should create a project (no auth required)", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const { db } = await import("./db");
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
    it("should return projects list (no auth required)", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // Mock database to return projects
      const { db } = await import("./db");
      vi.mocked(db.orderBy).mockResolvedValueOnce([
        { id: 1, name: "Test Project", projectKey: "abc123", createdAt: new Date() },
      ]);

      const result = await caller.projects.list();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("projects.getByKey", () => {
    it("should return project info for valid key", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // Mock project lookup to return a project
      const { db } = await import("./db");
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
      vi.mocked(db.where).mockResolvedValueOnce([]);

      await expect(
        caller.projects.getByKey({ projectKey: "invalid-key" })
      ).rejects.toThrow("Project not found");
    });
  });
});
