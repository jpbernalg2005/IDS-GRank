import { Dumbbell } from "lucide-react";
import { TIER_COLORS, TIER_LABELS, type Tier } from "@/lib/tiers";

interface PRCardProps {
  exercise: string;
  category: string;
  weight: string;
  reps: number;
  tier?: Tier;
  date?: string;
}

export function PRCard({ exercise, category, weight, reps, tier, date }: PRCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading text-lg leading-none tracking-wide">{exercise}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{category}</p>
          </div>
        </div>
        {tier && (
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${TIER_COLORS[tier]}`}>
            {TIER_LABELS[tier]}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <span className="text-2xl font-bold tracking-tight">{weight}</span>
          <span className="ml-1 text-sm text-muted-foreground">kg</span>
          <span className="mx-2 text-muted-foreground">×</span>
          <span className="text-lg font-semibold">{reps}</span>
          <span className="ml-1 text-sm text-muted-foreground">reps</span>
        </div>
        {date && (
          <span className="text-xs text-muted-foreground">
            {new Date(date).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
