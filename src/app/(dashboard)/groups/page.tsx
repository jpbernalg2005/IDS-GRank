import { auth } from "@/lib/auth";
import { db } from "@/db";
import { competitionGroups, groupMembers, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Users, Shield, User } from "lucide-react";

export default async function GroupsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = Number(session.user.id);

  const myMemberships = await db
    .select({
      groupId: groupMembers.groupId,
      role: groupMembers.role,
      groupName: competitionGroups.name,
      groupDesc: competitionGroups.description,
      inviteCode: competitionGroups.inviteCode,
    })
    .from(groupMembers)
    .innerJoin(competitionGroups, eq(groupMembers.groupId, competitionGroups.id))
    .where(eq(groupMembers.userId, userId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl tracking-wide">Grupos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Compite con tus amigos</p>
        </div>
        <Link
          href="/groups/create"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Crear Grupo
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading text-lg tracking-wide">Unirse a un grupo</h3>
            <p className="text-xs text-muted-foreground">Ingresa un código de invitación</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <input
            placeholder="Código de invitación"
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Unirse
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {myMemberships.length > 0 ? (
          myMemberships.map((m) => (
            <Link
              key={m.groupId}
              href={`/groups/${m.groupId}`}
              className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-xl tracking-wide">{m.groupName}</h3>
                  <p className="text-xs text-muted-foreground">{m.groupDesc || "Sin descripción"}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {m.role === "ADMIN" ? <Shield className="h-3.5 w-3.5 text-primary" /> : <User className="h-3.5 w-3.5" />}
                  {m.role}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No perteneces a ningún grupo</p>
            <Link
              href="/groups/create"
              className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Crear un grupo
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
