"use client";

import { useState, useEffect } from "react";
import { getTier, TIER_COLORS, TIER_LABELS, type Tier } from "@/lib/tiers";

interface Category {
  id: number;
  name: string;
  tierPlastic: string | null;
  tierBronze: string | null;
  tierGold: string | null;
  tierPlatinum: string | null;
  tierEmerald: string | null;
  tierDiamond: string | null;
  tierChallenger: string | null;
}

interface RankingEntry {
  userId: number;
  username: string;
  weightKg: string;
  exerciseName: string;
  sex?: string;
  userWeightKg?: string;
  tier: Tier;
}

type FilterMode = "global" | "weight" | "sex";

export default function RankingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryData, setCategoryData] = useState<{ category: Category; entries: RankingEntry[] }[]>([]);
  const [filter, setFilter] = useState<FilterMode>("global");
  const [sexFilter, setSexFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [sessionUserId, setSessionUserId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/exercises?categories=true")
      .then((r) => r.json())
      .then(async (cats: Category[]) => {
        const catData = await Promise.all(
          cats.map(async (cat) => {
            const prRes = await fetch(`/api/personal-records?categoryId=${cat.id}`);
            const prs: Omit<RankingEntry, "tier">[] = await prRes.json();
            const entries: RankingEntry[] = prs.map((pr) => ({
              ...pr,
              tier: getTier(Number(pr.weightKg), cat),
            }));
            return { category: cat, entries };
          })
        );
        setCategories(cats);
        setCategoryData(catData);
      });

    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => setSessionUserId(Number(data?.user?.id)));
  }, []);

  const getFilteredData = () => {
    return categoryData.map(({ category, entries }) => {
      let filtered = [...entries];

      if (filter === "weight") {
        filtered = filtered.filter((e) => e.userWeightKg && Number(e.userWeightKg) > 0);
        filtered.sort((a, b) => {
          const ratioA = Number(a.weightKg) / Number(a.userWeightKg || 1);
          const ratioB = Number(b.weightKg) / Number(b.userWeightKg || 1);
          return ratioB - ratioA;
        });
      }

      if (filter === "sex" && sexFilter !== "ALL") {
        filtered = filtered.filter((e) => e.sex === sexFilter);
      }

      return {
        category,
        entries: filtered.slice(0, 5),
      };
    });
  };

  const filteredData = getFilteredData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl tracking-wide">Rankings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Los mejores levantadores por categoría</p>
      </div>

      <div className="flex gap-2 border-b border-border pb-2">
        {(["global", "weight", "sex"] as FilterMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setFilter(mode)}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
              filter === mode ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {mode === "global" ? "Global" : mode === "weight" ? "Por Peso" : "Por Sexo"}
          </button>
        ))}
      </div>

      {filter === "sex" && (
        <div className="flex gap-2">
          {(["ALL", "MALE", "FEMALE"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSexFilter(s)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                sexFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {s === "ALL" ? "Todos" : s === "MALE" ? "Masculino" : "Femenino"}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {filteredData.map(({ category: cat, entries }) => (
          <div key={cat.id} className="space-y-3">
            <h2 className="font-heading text-2xl tracking-wide text-primary">{cat.name}</h2>
            <div className="space-y-1.5">
              {entries.map((row, idx) => (
                <div
                  key={`${row.userId}-${row.exerciseName}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      idx === 0 ? "bg-yellow-500 text-yellow-950" :
                      idx === 1 ? "bg-slate-300 text-slate-800" :
                      idx === 2 ? "bg-amber-700 text-amber-100" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{row.username}</p>
                      <p className="text-[10px] text-muted-foreground">{row.exerciseName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${TIER_COLORS[row.tier]}`}>
                      {TIER_LABELS[row.tier]}
                    </span>
                    <div className="text-right">
                      <p className="text-sm font-bold">{row.weightKg} kg</p>
                      {filter === "weight" && row.userWeightKg && (
                        <p className="text-[10px] text-muted-foreground">
                          {(Number(row.weightKg) / Number(row.userWeightKg)).toFixed(2)}x peso corporal
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {entries.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">Sin registros aún</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
