import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { RewardsCatalog } from "@/components/rewards-catalog";

export const metadata = {
  title: "Tienda de Recompensas — GRank",
  description: "Canjea tus monedas por insignias, marcos de avatar y títulos exclusivos.",
};

export default async function RewardsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = Number(session.user.id);
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) redirect("/login");

  return (
    <RewardsCatalog
      initialCoins={user.coins}
      initialEquippedFrameId={user.equippedFrameRewardId}
      initialEquippedTitleId={user.equippedTitleRewardId}
    />
  );
}
