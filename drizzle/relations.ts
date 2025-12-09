import { relations } from "drizzle-orm";
import { users, projects, bugReports } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  bugReports: many(bugReports),
}));

export const bugReportsRelations = relations(bugReports, ({ one }) => ({
  project: one(projects, {
    fields: [bugReports.projectId],
    references: [projects.id],
  }),
}));
