import { pgTable, serial, varchar, decimal, timestamp, text, integer } from "drizzle-orm/pg-core";
import { rewards } from "./rewards";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 100 }),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  sex: varchar("sex", { length: 10 }).notNull().default("MALE"),
  weightKg: decimal("weight_kg", { precision: 5, scale: 2 }),
  heightCm: decimal("height_cm", { precision: 5, scale: 1 }),
  dateOfBirth: timestamp("date_of_birth"),
  experienceLevel: varchar("experience_level", { length: 20 }).default("BEGINNER"),
  totalPoints: integer("total_points").default(0),
  coins: integer("coins").notNull().default(100),
  equippedFrameRewardId: integer("equipped_frame_reward_id").references(() => rewards.id),
  equippedTitleRewardId: integer("equipped_title_reward_id").references(() => rewards.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
