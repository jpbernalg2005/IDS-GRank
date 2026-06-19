"use client";

import { useState, useEffect } from "react";
import { UserPlus, Users, Check, X } from "lucide-react";

interface Friend {
  id: number;
  requesterId: number;
  addresseeId: number;
  status: string;
  requester: { id: number; username: string };
  addressee: { id: number; username: string };
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchUsername, setSearchUsername] = useState("");

  const loadFriends = async () => {
    const res = await fetch("/api/friends");
    const data = await res.json();
    setFriends(data);
  };

  useEffect(() => {
    loadFriends();
  }, []);

  const addFriend = async () => {
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: searchUsername }),
    });

    if (res.ok) {
      setSearchUsername("");
      loadFriends();
    }
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
            placeholder="Buscar usuario..."
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onKeyDown={(e) => e.key === "Enter" && addFriend()}
          />
          <button
            onClick={addFriend}
            className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Agregar
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {friends.length > 0 ? (
          friends.map((f) => {
            const friendName = f.requesterId === Number(f.requester.id)
              ? f.addressee.username
              : f.requester.username;
            return (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {friendName[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{friendName}</p>
                    <p className="text-xs text-muted-foreground">Amigo</p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No tienes amigos agregados</p>
            <p className="text-xs text-muted-foreground">Busca usuarios por su nombre de usuario</p>
          </div>
        )}
      </div>
    </div>
  );
}
