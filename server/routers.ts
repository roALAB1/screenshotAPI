import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { db } from "./db";
import { bugReports, projects } from "../drizzle/schema";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { storagePut, storageGet } from "./storage";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

// Zod schemas for validation
const consoleLogEntrySchema = z.object({
  type: z.enum(["log", "error", "warn", "info", "debug"]),
  message: z.string(),
  timestamp: z.number(),
  stack: z.string().optional(),
});

const networkEntrySchema = z.object({
  method: z.string(),
  url: z.string(),
  status: z.number(),
  statusText: z.string(),
  requestHeaders: z.record(z.string(), z.string()),
  responseHeaders: z.record(z.string(), z.string()),
  requestBody: z.string().optional(),
  responseBody: z.string().optional(),
  startTime: z.number(),
  duration: z.number(),
  size: z.number(),
  type: z.string(),
});

const userActionSchema = z.object({
  action: z.string(),
  target: z.string(),
  timestamp: z.number(),
});

const deviceInfoSchema = z.object({
  userAgent: z.string(),
  platform: z.string(),
  language: z.string(),
  screenWidth: z.number(),
  screenHeight: z.number(),
  viewportWidth: z.number(),
  viewportHeight: z.number(),
  devicePixelRatio: z.number(),
  timezone: z.string(),
  cookiesEnabled: z.boolean(),
});

// Project router - no auth required
const projectRouter = router({
  // List all projects
  list: publicProcedure.query(async () => {
    const result = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
    return result;
  }),

  // Get a single project by ID
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.id));
      
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      return project;
    }),

  // Get project by key (for SDK)
  getByKey: publicProcedure
    .input(z.object({ projectKey: z.string() }))
    .query(async ({ input }) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.projectKey, input.projectKey));
      
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      return { id: project.id, name: project.name };
    }),

  // Create a new project
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        urlPattern: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const projectKey = nanoid(12);
      const [result] = await db.insert(projects).values({
        projectKey,
        name: input.name,
        description: input.description || null,
        urlPattern: input.urlPattern || null,
        ownerId: 1, // Default owner since no auth
      });
      
      return { id: result.insertId, projectKey };
    }),

  // Update a project
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        urlPattern: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id));
      
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      await db
        .update(projects)
        .set(updates)
        .where(eq(projects.id, id));
      
      return { success: true };
    }),

  // Delete a project
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.id));
      
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Delete all bug reports for this project first
      await db.delete(bugReports).where(eq(bugReports.projectId, input.id));
      
      // Delete the project
      await db.delete(projects).where(eq(projects.id, input.id));
      
      return { success: true };
    }),
});

// Bug report router - no auth required
const bugReportRouter = router({
  // List bug reports with filtering
  list: publicProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        status: z.enum(["new", "in_progress", "resolved", "closed"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      // Build conditions
      const conditions = [];
      
      if (input.projectId) {
        conditions.push(eq(bugReports.projectId, input.projectId));
      }
      if (input.status) {
        conditions.push(eq(bugReports.status, input.status));
      }
      if (input.priority) {
        conditions.push(eq(bugReports.priority, input.priority));
      }
      if (input.search) {
        conditions.push(
          sql`(${bugReports.title} LIKE ${`%${input.search}%`} OR ${bugReports.description} LIKE ${`%${input.search}%`})`
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [reports, countResult] = await Promise.all([
        db
          .select()
          .from(bugReports)
          .where(whereClause)
          .orderBy(desc(bugReports.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(bugReports)
          .where(whereClause),
      ]);

      return {
        reports,
        total: countResult[0]?.count || 0,
      };
    }),

  // Get a single bug report
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [report] = await db
        .select()
        .from(bugReports)
        .where(eq(bugReports.id, input.id));
      
      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bug report not found" });
      }

      return report;
    }),

  // Submit a new bug report (public endpoint for SDK)
  submit: publicProcedure
    .input(
      z.object({
        projectKey: z.string(),
        title: z.string().max(255).optional(),
        description: z.string().optional(),
        pageUrl: z.string(),
        screenshot: z.string().optional(), // Base64 encoded
        consoleLogs: z.array(consoleLogEntrySchema).optional(),
        networkLogs: z.array(networkEntrySchema).optional(),
        deviceInfo: deviceInfoSchema.optional(),
        userActions: z.array(userActionSchema).optional(),
        reporterEmail: z.string().email().optional(),
        reporterName: z.string().max(255).optional(),
        sessionId: z.string().max(64).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Find project by key
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.projectKey, input.projectKey));
      
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid project key" });
      }

      // Upload screenshot to S3 if provided
      let screenshotUrl: string | undefined;
      if (input.screenshot) {
        try {
          // Convert base64 to buffer
          const base64Data = input.screenshot.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          
          // Generate unique filename
          const filename = `screenshots/${project.id}/${nanoid()}.png`;
          
          // Upload to S3
          const result = await storagePut(filename, buffer, "image/png");
          screenshotUrl = result.url;
        } catch (error) {
          console.error("Failed to upload screenshot:", error);
          // Continue without screenshot
        }
      }

      // Insert bug report
      const [result] = await db.insert(bugReports).values({
        projectId: project.id,
        title: input.title || "Untitled Bug Report",
        description: input.description || null,
        pageUrl: input.pageUrl,
        screenshotUrl: screenshotUrl || null,
        consoleLogs: input.consoleLogs || null,
        networkLogs: input.networkLogs || null,
        deviceInfo: input.deviceInfo || null,
        userActions: input.userActions || null,
        reporterEmail: input.reporterEmail || null,
        reporterName: input.reporterName || null,
        sessionId: input.sessionId || null,
      });

      return { id: result.insertId, success: true };
    }),

  // Update bug report status/priority
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "in_progress", "resolved", "closed"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        title: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;

      const [report] = await db
        .select()
        .from(bugReports)
        .where(eq(bugReports.id, id));
      
      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bug report not found" });
      }

      await db
        .update(bugReports)
        .set(updates)
        .where(eq(bugReports.id, id));
      
      return { success: true };
    }),

  // Delete a bug report
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [report] = await db
        .select()
        .from(bugReports)
        .where(eq(bugReports.id, input.id));
      
      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bug report not found" });
      }

      await db.delete(bugReports).where(eq(bugReports.id, input.id));
      
      return { success: true };
    }),

  // Get stats for dashboard
  stats: publicProcedure.query(async () => {
    const [statusCounts, priorityCounts] = await Promise.all([
      db
        .select({
          status: bugReports.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(bugReports)
        .groupBy(bugReports.status),
      db
        .select({
          priority: bugReports.priority,
          count: sql<number>`COUNT(*)`,
        })
        .from(bugReports)
        .groupBy(bugReports.priority),
    ]);

    const statusMap = Object.fromEntries(
      statusCounts.map((s) => [s.status, Number(s.count)])
    );
    const priorityMap = Object.fromEntries(
      priorityCounts.map((p) => [p.priority, Number(p.count)])
    );

    return {
      total: Object.values(statusMap).reduce((a, b) => a + b, 0),
      new: statusMap.new || 0,
      inProgress: statusMap.in_progress || 0,
      resolved: statusMap.resolved || 0,
      closed: statusMap.closed || 0,
      byPriority: {
        low: priorityMap.low || 0,
        medium: priorityMap.medium || 0,
        high: priorityMap.high || 0,
        critical: priorityMap.critical || 0,
      },
    };
  }),
});

export const appRouter = router({
  system: systemRouter,
  projects: projectRouter,
  bugReports: bugReportRouter,
});

export type AppRouter = typeof appRouter;
