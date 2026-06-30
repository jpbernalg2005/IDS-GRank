"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Coins } from "lucide-react";

interface Exercise {
  id: number;
  name: string;
}

function CreateChallengeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "FRIEND";
  const targetUserId = searchParams.get("userId");
  const targetName = searchParams.get("name") || "";
  const groupId = searchParams.get("groupId");

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [userCoins, setUserCoins] = useState<number>(0);
  const [form, setForm] = useState({
    exerciseId: "",
    title: "",
    description: "",
    deadline: "",
    rewardCoins: "10",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then(setExercises);
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(async (s) => {
        if (s?.user?.id) {
          const res = await fetch(`/api/users/me`);
          if (res.ok) {
            const data = await res.json();
            setUserCoins(data.coins ?? 0);
          }
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const body: Record<string, unknown> = {
      type,
      title: form.title,
      description: form.description || undefined,
      rewardCoins: Number(form.rewardCoins),
      exerciseId: form.exerciseId ? Number(form.exerciseId) : undefined,
      deadline: form.deadline || undefined,
    };

    if (type === "FRIEND") body.targetUserId = Number(targetUserId);
    if (type === "GROUP") body.groupId = Number(groupId);

    const res = await fetch("/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push("/");
    } else {
      const data = await res.json();
      setError(data.error || "Error al crear el reto");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={type === "GROUP" ? "/groups" : "/friends"} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-4xl tracking-wide">Nuevo Reto</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {type === "FRIEND" ? `Retar a ${targetName}` : `Reto para grupo ${targetName}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
        <Coins className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium">Tu saldo: <span className="text-primary">{userCoins} monedas</span></span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <label className="text-sm font-medium">Ejercicio (opcional)</label>
          <select
            value={form.exerciseId}
            onChange={(e) => setForm({ ...form, exerciseId: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Sin ejercicio específico</option>
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Meta del reto</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Ej: Press banca 100 kg, 10 dominadas seguidas..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Descripción (opcional)</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Detalles adicionales del reto..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Monedas que apuestas</label>
            <input
              type="number"
              min="1"
              value={form.rewardCoins}
              onChange={(e) => setForm({ ...form, rewardCoins: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha límite</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {submitting ? "Creando..." : "Crear Reto"}
        </button>
      </form>
    </div>
  );
}

export default function CreateChallengePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Cargando...</div>}>
      <CreateChallengeForm />
    </Suspense>
  );
}
