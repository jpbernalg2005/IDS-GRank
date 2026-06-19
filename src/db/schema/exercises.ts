import { pgTable, serial, varchar, text, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { exerciseCategories } from "./exercise-categories";

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => exerciseCategories.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  instructions: text("instructions"),
  demoVideoUrl: text("demo_video_url"),
  unit: varchar("unit", { length: 10 }).default("kg"),
});

export const exercisesRelations = relations(exercises, ({ one }) => ({
  category: one(exerciseCategories, {
    fields: [exercises.categoryId],
    references: [exerciseCategories.id],
  }),
}));

export type Exercise = typeof exercises.$inferSelect;
