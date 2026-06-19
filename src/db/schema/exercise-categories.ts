import { pgTable, serial, varchar, text, decimal } from "drizzle-orm/pg-core";

export const exerciseCategories = pgTable("exercise_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).unique().notNull(),
  description: text("description"),
  iconUrl: text("icon_url"),
  tierPlastic: decimal("tier_plastic", { precision: 6, scale: 2 }).default("0"),
  tierBronze: decimal("tier_bronze", { precision: 6, scale: 2 }).default("0"),
  tierGold: decimal("tier_gold", { precision: 6, scale: 2 }).default("0"),
  tierPlatinum: decimal("tier_platinum", { precision: 6, scale: 2 }).default("0"),
  tierEmerald: decimal("tier_emerald", { precision: 6, scale: 2 }).default("0"),
  tierDiamond: decimal("tier_diamond", { precision: 6, scale: 2 }).default("0"),
  tierChallenger: decimal("tier_challenger", { precision: 6, scale: 2 }).default("0"),
});

export type ExerciseCategory = typeof exerciseCategories.$inferSelect;
