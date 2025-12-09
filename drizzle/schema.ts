import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects table for organizing bug reports by application/project
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  /** Unique project identifier used in SDK integration */
  projectKey: varchar("projectKey", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  /** URL pattern for the project (optional, for filtering) */
  urlPattern: varchar("urlPattern", { length: 512 }),
  /** Owner user ID */
  ownerId: int("ownerId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Console log entry structure for JSON storage
 */
export interface ConsoleLogEntry {
  type: "log" | "error" | "warn" | "info" | "debug";
  message: string;
  timestamp: number;
  stack?: string;
}

/**
 * HAR entry structure (simplified) for JSON storage
 */
export interface NetworkEntry {
  method: string;
  url: string;
  status: number;
  statusText: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  startTime: number;
  duration: number;
  size: number;
  type: string;
}

/**
 * Device/browser metadata
 */
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  timezone: string;
  cookiesEnabled: boolean;
}

/**
 * Bug reports table - main table for captured bug data
 */
export const bugReports = mysqlTable("bugReports", {
  id: int("id").autoincrement().primaryKey(),
  /** Reference to project */
  projectId: int("projectId").notNull(),
  /** User-provided title/summary */
  title: varchar("title", { length: 255 }),
  /** User-provided description of the issue */
  description: text("description"),
  /** URL where the bug was captured */
  pageUrl: varchar("pageUrl", { length: 2048 }).notNull(),
  /** Screenshot URL stored in S3 */
  screenshotUrl: varchar("screenshotUrl", { length: 1024 }),
  /** Console logs as JSON array */
  consoleLogs: json("consoleLogs").$type<ConsoleLogEntry[]>(),
  /** Network requests as JSON array (HAR-like format) */
  networkLogs: json("networkLogs").$type<NetworkEntry[]>(),
  /** Device and browser information */
  deviceInfo: json("deviceInfo").$type<DeviceInfo>(),
  /** User actions/clicks leading up to the bug */
  userActions: json("userActions").$type<{ action: string; target: string; timestamp: number }[]>(),
  /** Status of the bug report */
  status: mysqlEnum("status", ["new", "in_progress", "resolved", "closed"]).default("new").notNull(),
  /** Priority level */
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  /** Reporter email (optional, for non-authenticated users) */
  reporterEmail: varchar("reporterEmail", { length: 320 }),
  /** Reporter name (optional) */
  reporterName: varchar("reporterName", { length: 255 }),
  /** Session ID for grouping related reports */
  sessionId: varchar("sessionId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BugReport = typeof bugReports.$inferSelect;
export type InsertBugReport = typeof bugReports.$inferInsert;
