"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Users, Shield, User, LogIn, Swords } from "lucide-react";

interface GroupInfo {
  id: number;
  name: string;
  description: string | null;
  inviteCode: string | null;
}

interface Membership {
  groupId: number;
  role: string;
  groupName: string;
  groupDesc: string | null;
  inviteCode: string | null;
  group: GroupInfo;
}

export default function GroupsPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const loadGroups = async () => {
    const res = await fetch("/api/groups");
    const data = await res.json();
    setMemberships(data || []);
  };

  useEffect(() => { loadGroups(); }, []);

  const joinGroup = async () => {
    setJoinError("");
    const res = await fetch("/api/groups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: inviteCode.toUpperCase() }),
    });
    if (res.ok) {
      setInviteCode("");
      loadGroups();
    } else {
      const data = await res.json();
      setJoinError(data.error || "Error al unirse");
    }
  };

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
            <LogIn className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading text-lg tracking-wide">Unirse a un grupo</h3>
            <p className="text-xs text-muted-foreground">Ingresa un código de invitación</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Código de invitación"
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring uppercase"
            onKeyDown={(e) => e.key === "Enter" && joinGroup()}
          />
          <button
            onClick={joinGroup}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Unirse
          </button>
        </div>
        {joinError && <p className="mt-2 text-xs text-destructive">{joinError}</p>}
      </div>

      <div className="space-y-2">
        {memberships.length > 0 ? (
          memberships.map((m) => (
            <Link
              key={m.groupId}
              href={`/groups/${m.groupId}`}
              className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-xl tracking-wide">{m.group?.name || m.groupName}</h3>
                  <p className="text-xs text-muted-foreground">{m.group?.description || m.groupDesc || "Sin descripción"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/challenges/create?type=GROUP&groupId=${m.group?.id || m.groupId}&name=${encodeURIComponent(m.group?.name || m.groupName)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Swords className="h-3 w-3" />
                    Crear reto
                  </Link>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {m.role === "ADMIN" ? <Shield className="h-3.5 w-3.5 text-primary" /> : <User className="h-3.5 w-3.5" />}
                    {m.role}
                  </div>
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
