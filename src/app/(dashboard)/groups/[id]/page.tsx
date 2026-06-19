import { auth } from "@/lib/auth";
import { db } from "@/db";
import { competitionGroups, groupMembers, users, personalRecords, exercises } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { CopyButton } from "@/components/copy-button";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const groupId = Number(id);

  const group = await db.query.competitionGroups.findFirst({
    where: eq(competitionGroups.id, groupId),
  });

  if (!group) redirect("/groups");

  const members = await db
    .select({
      id: groupMembers.id,
      role: groupMembers.role,
      userId: users.id,
      username: users.username,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));

  const memberRankings = await Promise.all(
    members.map(async (member) => {
      const topPR = await db
        .select({
          weightKg: personalRecords.weightKg,
          exerciseName: exercises.name,
        })
        .from(personalRecords)
        .innerJoin(exercises, eq(personalRecords.exerciseId, exercises.id))
        .where(eq(personalRecords.userId, member.userId))
        .orderBy(desc(personalRecords.weightKg))
        .limit(1);

      return {
        ...member,
        topPR: topPR[0] || null,
      };
    })
  );

  memberRankings.sort((a, b) => {
    const aW = a.topPR ? Number(a.topPR.weightKg) : 0;
    const bW = b.topPR ? Number(b.topPR.weightKg) : 0;
    return bW - aW;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/groups" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-heading text-4xl tracking-wide">{group.name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{group.description}</p>
        </div>
      </div>

      {group.inviteCode && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground">Código de invitación</p>
            <p className="font-heading text-xl tracking-wide text-primary">{group.inviteCode}</p>
          </div>
          <CopyButton text={group.inviteCode || ""} />
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-heading text-2xl tracking-wide">Clasificación</h2>
        <div className="space-y-1.5">
          {memberRankings.map((m, idx) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  idx === 0 ? "bg-yellow-500 text-yellow-950" :
                  idx === 1 ? "bg-slate-300 text-slate-800" :
                  idx === 2 ? "bg-amber-700 text-amber-100" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {idx + 1}
                </span>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{m.username}</p>
                  {m.role === "ADMIN" && <Shield className="h-3.5 w-3.5 text-primary" />}
                </div>
              </div>
              <div className="text-right">
                {m.topPR ? (
                  <>
                    <p className="text-sm font-bold">{m.topPR.weightKg} kg</p>
                    <p className="text-[10px] text-muted-foreground">{m.topPR.exerciseName}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Sin PRs</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
