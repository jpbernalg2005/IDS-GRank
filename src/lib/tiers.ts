export const TIERS = ["PLASTIC", "BRONZE", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "CHALLENGER"] as const;
export type Tier = (typeof TIERS)[number];

export interface TierThresholds {
  tierPlastic: string | null;
  tierBronze: string | null;
  tierGold: string | null;
  tierPlatinum: string | null;
  tierEmerald: string | null;
  tierDiamond: string | null;
  tierChallenger: string | null;
}

export function getTier(weightKg: number, category: TierThresholds): Tier {
  const w = weightKg;
  if (w >= Number(category.tierChallenger ?? 0)) return "CHALLENGER";
  if (w >= Number(category.tierDiamond ?? 0)) return "DIAMOND";
  if (w >= Number(category.tierEmerald ?? 0)) return "EMERALD";
  if (w >= Number(category.tierPlatinum ?? 0)) return "PLATINUM";
  if (w >= Number(category.tierGold ?? 0)) return "GOLD";
  if (w >= Number(category.tierBronze ?? 0)) return "BRONZE";
  return "PLASTIC";
}

export const TIER_POINTS: Record<Tier, number> = {
  PLASTIC: 1,
  BRONZE: 2,
  GOLD: 4,
  PLATINUM: 7,
  EMERALD: 12,
  DIAMOND: 20,
  CHALLENGER: 35,
};

export const TIER_LABELS: Record<Tier, string> = {
  PLASTIC: "Plástico",
  BRONZE: "Bronce",
  GOLD: "Oro",
  PLATINUM: "Platino",
  EMERALD: "Esmeralda",
  DIAMOND: "Diamante",
  CHALLENGER: "Challenger",
};

export const TIER_COLORS: Record<Tier, string> = {
  PLASTIC: "bg-zinc-600 text-zinc-100",
  BRONZE: "bg-amber-900 text-amber-100",
  GOLD: "bg-yellow-500 text-yellow-950",
  PLATINUM: "bg-cyan-600 text-cyan-100",
  EMERALD: "bg-emerald-600 text-emerald-100",
  DIAMOND: "bg-sky-400 text-sky-950",
  CHALLENGER: "bg-rose-600 text-rose-100",
};
