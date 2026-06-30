"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserPlus, Users, Check, X, Search, Swords } from "lucide-react";

interface FriendUser {
  id: number;
  username: string;
}

interface AvailableUser {
  id: number;
  username: string;
  displayName: string | null;
}

interface Friendship {
  id: number;
  requesterId: number;
  addresseeId: number;
  status: string;
  requester: FriendUser;
  addressee: FriendUser;
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pending, setPending] = useState<Friendship[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [searchUsername, setSearchUsername] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadFriends = async () => {
    const sessionRes = await fetch("/api/auth/session");
    const sessionData = await sessionRes.json();
    const uid = Number(sessionData?.user?.id);
    setUserId(uid);

    const [friendsRes, usersRes] = await Promise.all([
      fetch("/api/friends"),
      fetch("/api/friends?search=users"),
    ]);

    const friendsData = await friendsRes.json();
    setFriends(friendsData.friends || []);
    setPending(friendsData.pending || []);

    if (uid) {
      const usersData = await usersRes.json();
      setAvailableUsers(usersData || []);
    }
  };

  useEffect(() => { loadFriends(); }, []);

  const addFriend = async (username: string) => {
    setError("");
    setSuccess("");
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    if (res.ok) {
      setSuccess(`Solicitud enviada a ${username}`);
      setSearchUsername("");
      loadFriends();
    } else {
      const data = await res.json();
      setError(data.error || "Error al agregar");
    }
  };

  const handleRequest = async (friendshipId: number, action: "accept" | "reject") => {
    await fetch("/api/friends", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action }),
    });
    loadFriends();
  };

  const getFriendName = (f: Friendship) => {
    if (!userId) return "";
    return f.requesterId === userId ? f.addressee.username : f.requester.username;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl tracking-wide">Amigos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Conecta con otros levantadores</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex gap-2">
          <input
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            placeholder="Buscar usuario por nombre..."
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onKeyDown={(e) => e.key === "Enter" && searchUsername && addFriend(searchUsername)}
          />
          <button
            onClick={() => searchUsername && addFriend(searchUsername)}
            disabled={!searchUsername}
            className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            Agregar
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        {success && <p className="mt-2 text-xs text-green-500">{success}</p>}
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-heading text-xl tracking-wide text-primary">Solicitudes pendientes</h2>
          {pending.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {f.requester.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{f.requester.username}</p>
                  <p className="text-xs text-muted-foreground">Quiere ser tu amigo</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleRequest(f.id, "accept")} className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => handleRequest(f.id, "reject")} className="rounded-lg bg-destructive/10 p-2 text-destructive hover:bg-destructive/20 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {availableUsers.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-heading text-xl tracking-wide">Usuarios disponibles</h2>
          {availableUsers.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {u.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{u.displayName || u.username}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
              </div>
              <button
                onClick={() => addFriend(u.username)}
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Agregar
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="font-heading text-xl tracking-wide">Mis amigos</h2>
        {friends.length > 0 ? (
          friends.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {getFriendName(f)[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{getFriendName(f)}</p>
                  <p className="text-xs text-muted-foreground">Amigo</p>
                </div>
              </div>
              <Link
                href={`/challenges/create?type=FRIEND&userId=${f.requesterId === userId ? f.addresseeId : f.requesterId}&name=${encodeURIComponent(getFriendName(f))}`}
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                <Swords className="h-3.5 w-3.5" />
                Retar
              </Link>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No tienes amigos agregados</p>
            <p className="text-xs text-muted-foreground">Busca usuarios o agrega de la lista de disponibles</p>
          </div>
        )}
      </div>
    </div>
  );
}
