import { relations } from "drizzle-orm";
import { users } from "./users";
import { rewards } from "./rewards";

// Relations tying a user to their currently-equipped cosmetic rewards.
// Kept in a separate file (rather than users.ts/rewards.ts) since the two
// tables already import each other for the FK columns; this avoids adding
// a second circular edge just for the relational query helpers.
export const usersEquippedRewardsRelations = relations(users, ({ one }) => ({
  equippedFrame: one(rewards, {
    fields: [users.equippedFrameRewardId],
    references: [rewards.id],
    relationName: "equippedFrame",
  }),
  equippedTitle: one(rewards, {
    fields: [users.equippedTitleRewardId],
    references: [rewards.id],
    relationName: "equippedTitle",
  }),
}));
