import { pgTable, serial, varchar, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { exercises } from "./exercises";

export const workoutPlans = pgTable("workout_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workoutPlanExercises = pgTable("workout_plan_exercises", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => workoutPlans.id),
  exerciseId: integer("exercise_id").notNull().references(() => exercises.id),
  sets: integer("sets").default(3),
  reps: varchar("reps", { length: 50 }).default("10"),
  restTimeSeconds: integer("rest_time_seconds").default(60),
  orderIndex: integer("order_index").default(0),
  notes: text("notes"),
});

export const workoutPlansRelations = relations(workoutPlans, ({ one, many }) => ({
  user: one(users, {
    fields: [workoutPlans.userId],
    references: [users.id],
  }),
  exercises: many(workoutPlanExercises),
}));

export const workoutPlanExercisesRelations = relations(workoutPlanExercises, ({ one }) => ({
  plan: one(workoutPlans, {
    fields: [workoutPlanExercises.planId],
    references: [workoutPlans.id],
  }),
  exercise: one(exercises, {
    fields: [workoutPlanExercises.exerciseId],
    references: [exercises.id],
  }),
}));

export type WorkoutPlan = typeof workoutPlans.$inferSelect;
