import { auth } from "@/lib/auth";
import { db } from "@/db";
import { exerciseCategories } from "@/db/schema";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Dumbbell, Plus, ClipboardList } from "lucide-react";

const categoryIcons: Record<string, string> = {
  Chest: "🏋️",
  Back: "🔙",
  Legs: "🦵",
  Shoulders: "💪",
  Arms: "💪",
  Core: "🔥",
};

export default async function ExercisesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const categories = await db.query.exerciseCategories.findMany();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl tracking-wide">Ejercicios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registra tus marcas personales</p>
        </div>
        <Link
          href="/exercises/new-pr"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo PR
        </Link>
      </div>

      <Link
        href="/plans"
        className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
      >
        <ClipboardList className="h-5 w-5 text-primary" />
        <span className="font-heading text-lg tracking-wide">Mis Planes</span>
      </Link>

      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/exercises/${cat.id}`}
            className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
          >
            <div className="text-2xl">{categoryIcons[cat.name] || "🏆"}</div>
            <h3 className="mt-2 font-heading text-xl tracking-wide">{cat.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{cat.description || "Ejercicios de esta categoría"}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
