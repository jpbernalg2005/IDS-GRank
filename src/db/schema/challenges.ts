import { pgTable, serial, varchar, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { competitionGroups } from "./competition-groups";
import { exercises } from "./exercises";

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 10 }).notNull(),
  creatorId: integer("creator_id").notNull().references(() => users.id),
  groupId: integer("group_id").references(() => competitionGroups.id),
  exerciseId: integer("exercise_id").references(() => exercises.id),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  rewardCoins: integer("reward_coins").notNull().default(10),
  deadline: timestamp("deadline"),
  status: varchar("status", { length: 20 }).notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const challengeParticipants = pgTable("challenge_participants", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id").notNull().references(() => challenges.id),
  userId: integer("user_id").notNull().references(() => users.id),
  status: varchar("status", { length: 20 }).notNull().default("PENDING"),
  videoUrl: text("video_url"),
  submittedAt: timestamp("submitted_at"),
  validatedAt: timestamp("validated_at"),
  settled: boolean("settled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  creator: one(users, {
    fields: [challenges.creatorId],
    references: [users.id],
  }),
  group: one(competitionGroups, {
    fields: [challenges.groupId],
    references: [competitionGroups.id],
  }),
  exercise: one(exercises, {
    fields: [challenges.exerciseId],
    references: [exercises.id],
  }),
  participants: many(challengeParticipants),
}));

export const challengeParticipantsRelations = relations(challengeParticipants, ({ one }) => ({
  challenge: one(challenges, {
    fields: [challengeParticipants.challengeId],
    references: [challenges.id],
  }),
  user: one(users, {
    fields: [challengeParticipants.userId],
    references: [users.id],
  }),
}));

export type Challenge = typeof challenges.$inferSelect;
export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;
