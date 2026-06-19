"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";

interface Exercise {
  id: number;
  name: string;
  categoryId: number;
}

interface PlanExercise {
  exerciseId: string;
  sets: string;
  reps: string;
}

export default function CreatePlanPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [planExercises, setPlanExercises] = useState<PlanExercise[]>([]);

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then(setExercises);
  }, []);

  const addExercise = () => {
    setPlanExercises([...planExercises, { exerciseId: "", sets: "3", reps: "10" }]);
  };

  const removeExercise = (idx: number) => {
    setPlanExercises(planExercises.filter((_, i) => i !== idx));
  };

  const updateExercise = (idx: number, field: keyof PlanExercise, value: string) => {
    const updated = [...planExercises];
    updated[idx] = { ...updated[idx], [field]: value };
    setPlanExercises(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, exercises: planExercises }),
    });

    if (res.ok) {
      router.push("/plans");
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/plans" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-heading text-4xl tracking-wide">Crear Plan</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre del plan</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-xl tracking-wide">Ejercicios</h3>
            <button
              type="button"
              onClick={addExercise}
              className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </button>
          </div>

          {planExercises.map((pe, idx) => (
            <div key={idx} className="flex items-end gap-2 rounded-lg border border-border bg-background p-3">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">Ejercicio</label>
                <select
                  value={pe.exerciseId}
                  onChange={(e) => updateExercise(idx, "exerciseId", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                >
                  <option value="">Seleccionar</option>
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              </div>
              <div className="w-16 space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">Sets</label>
                <input
                  type="number"
                  value={pe.sets}
                  onChange={(e) => updateExercise(idx, "sets", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-center"
                />
              </div>
              <div className="w-16 space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">Reps</label>
                <input
                  value={pe.reps}
                  onChange={(e) => updateExercise(idx, "reps", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-center"
                />
              </div>
              <button
                type="button"
                onClick={() => removeExercise(idx)}
                className="rounded-md p-1.5 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          {planExercises.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Agrega ejercicios a tu plan
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Guardar Plan
        </button>
      </form>
    </div>
  );
}
