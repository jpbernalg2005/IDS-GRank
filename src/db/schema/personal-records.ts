import { pgTable, serial, varchar, decimal, integer, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { exercises } from "./exercises";

export const personalRecords = pgTable("personal_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  exerciseId: integer("exercise_id").notNull().references(() => exercises.id),
  weightKg: decimal("weight_kg", { precision: 6, scale: 2 }).notNull(),
  reps: integer("reps").notNull().default(1),
  date: timestamp("date").defaultNow().notNull(),
  videoUrl: text("video_url"),
  notes: text("notes"),
  isVerified: varchar("is_verified", { length: 20 }).default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const personalRecordsRelations = relations(personalRecords, ({ one }) => ({
  user: one(users, {
    fields: [personalRecords.userId],
    references: [users.id],
  }),
  exercise: one(exercises, {
    fields: [personalRecords.exerciseId],
    references: [exercises.id],
  }),
}));

export type PersonalRecord = typeof personalRecords.$inferSelect;
export type NewPersonalRecord = typeof personalRecords.$inferInsert;
