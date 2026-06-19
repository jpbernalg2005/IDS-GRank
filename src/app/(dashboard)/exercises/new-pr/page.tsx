"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload } from "lucide-react";

interface Exercise {
  id: number;
  name: string;
  categoryId: number;
}

function NewPRForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedExercise = searchParams.get("exerciseId");

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [form, setForm] = useState({
    exerciseId: preSelectedExercise || "",
    weightKg: "",
    reps: "1",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then(setExercises);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let videoUrl = "";

    if (videoFile) {
      const formData = new FormData();
      formData.append("video", videoFile);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      videoUrl = uploadData.url || "";
    }

    const res = await fetch("/api/personal-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, videoUrl }),
    });

    if (res.ok) {
      router.push("/exercises");
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/exercises" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-heading text-4xl tracking-wide">Nuevo PR</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <label className="text-sm font-medium">Ejercicio</label>
          <select
            value={form.exerciseId}
            onChange={(e) => setForm({ ...form, exerciseId: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          >
            <option value="">Selecciona un ejercicio</option>
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Peso (kg)</label>
            <input
              type="number"
              step="0.5"
              value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Repeticiones</label>
            <input
              type="number"
              min="1"
              value={form.reps}
              onChange={(e) => setForm({ ...form, reps: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Fecha</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Video (opcional)</label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-background px-4 py-6 text-sm text-muted-foreground hover:border-primary/50 transition-colors">
            <Upload className="h-5 w-5" />
            {videoFile ? videoFile.name : "Sube un video de tu marca"}
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Notas</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Sensación, técnica, etc."
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Guardar PR
        </button>
      </form>
    </div>
  );
}

export default function NewPRPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Cargando...</div>}>
      <NewPRForm />
    </Suspense>
  );
}
