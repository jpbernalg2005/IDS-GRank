import { pgTable, serial, varchar, text, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).notNull(), // BADGE | AVATAR_FRAME | TITLE
  costCoins: integer("cost_coins").notNull(),
  assetValue: varchar("asset_value", { length: 255 }).notNull(), // emoji / clase CSS / texto del título
  milestoneKey: varchar("milestone_key", { length: 50 }), // FIRST_PR | WEIGHT_100KG | DIAMOND_TIER | CONSECUTIVE_WINS_10 | null
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userRewards = pgTable("user_rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  rewardId: integer("reward_id").notNull().references(() => rewards.id),
  redeemedAt: timestamp("redeemed_at").defaultNow().notNull(),
}, (t) => ({
  uniqUserReward: unique().on(t.userId, t.rewardId),
}));

export const rewardsRelations = relations(rewards, ({ many }) => ({
  userRewards: many(userRewards),
}));

export const userRewardsRelations = relations(userRewards, ({ one }) => ({
  user: one(users, { fields: [userRewards.userId], references: [users.id] }),
  reward: one(rewards, { fields: [userRewards.rewardId], references: [rewards.id] }),
}));

export type Reward = typeof rewards.$inferSelect;
export type UserReward = typeof userRewards.$inferSelect;
