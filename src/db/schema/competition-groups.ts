import { pgTable, serial, varchar, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const competitionGroups = pgTable("competition_groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  inviteCode: varchar("invite_code", { length: 20 }).unique(),
  isPrivate: boolean("is_private").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => competitionGroups.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: varchar("role", { length: 20 }).notNull().default("MEMBER"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const competitionGroupsRelations = relations(competitionGroups, ({ one, many }) => ({
  creator: one(users, {
    fields: [competitionGroups.createdBy],
    references: [users.id],
  }),
  members: many(groupMembers),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(competitionGroups, {
    fields: [groupMembers.groupId],
    references: [competitionGroups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export type CompetitionGroup = typeof competitionGroups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
