import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, rewards, userRewards } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileForm } from "./profile-form";
import { Users, ClipboardList, Lock } from "lucide-react";
import { AvatarWithFrame, TitleChip } from "@/components/equipped-cosmetics";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = Number(session.user.id);
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { equippedFrame: true, equippedTitle: true },
  });
  if (!user) redirect("/login");

  const allBadges = await db
    .select()
    .from(rewards)
    .where(and(eq(rewards.type, "BADGE"), eq(rewards.isActive, true)));

  const ownedBadgeRows = await db
    .select({ rewardId: userRewards.rewardId })
    .from(userRewards)
    .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
    .where(and(eq(userRewards.userId, userId), eq(rewards.type, "BADGE")));
  const ownedBadgeIds = new Set(ownedBadgeRows.map((r) => r.rewardId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl tracking-wide">Mi Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gestiona tu información personal</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <AvatarWithFrame
            label={user.username?.[0]?.toUpperCase() ?? ""}
            frameAsset={user.equippedFrame?.assetValue}
            size="md"
          />
          <div>
            <h2 className="font-heading text-2xl tracking-wide">{user.username}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.equippedTitle && <TitleChip title={user.equippedTitle.assetValue} className="mt-2" />}
          </div>
        </div>
      </div>

      {allBadges.length > 0 && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-heading text-xl tracking-wide">Insignias</h3>
          <div className="flex flex-wrap gap-3">
            {allBadges.map((badge) => {
              const owned = ownedBadgeIds.has(badge.id);
              return (
                <div
                  key={badge.id}
                  title={badge.name}
                  className={`relative flex h-14 w-14 items-center justify-center rounded-xl border bg-gradient-to-br text-2xl ${
                    owned
                      ? "border-amber-500/30 from-amber-500/20 to-orange-500/20"
                      : "border-border from-muted/40 to-muted/20 grayscale opacity-40"
                  }`}
                >
                  {badge.assetValue}
                  {!owned && (
                    <Lock className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-background p-0.5 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ProfileForm user={user} />

      <div className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="font-heading text-xl tracking-wide">Acceso rápido</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/groups"
            className="flex flex-col items-center gap-2 rounded-lg bg-secondary p-4 text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Users className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium">Grupos</span>
          </Link>
          <Link
            href="/plans"
            className="flex flex-col items-center gap-2 rounded-lg bg-secondary p-4 text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <ClipboardList className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium">Planes</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
