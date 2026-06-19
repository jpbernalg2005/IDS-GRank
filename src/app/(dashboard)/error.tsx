"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <h2 className="font-heading text-2xl tracking-wide text-destructive">Algo salió mal</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error.message || "Error inesperado"}</p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
