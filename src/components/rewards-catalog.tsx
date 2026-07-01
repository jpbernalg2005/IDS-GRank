"use client";

import { useEffect, useState, useCallback } from "react";
import { ShoppingBag, Star, Award, Type, Coins, CheckCircle2, AlertCircle, Loader2, Package } from "lucide-react";

type RewardType = "BADGE" | "AVATAR_FRAME" | "TITLE";

interface Reward {
  id: number;
  name: string;
  description: string | null;
  type: string;
  costCoins: number;
  assetValue: string;
  isActive: boolean;
  createdAt: string;
}

interface OwnedReward {
  id: number;
  rewardId: number;
  redeemedAt: string;
  name: string;
  description: string | null;
  type: string;
  assetValue: string;
  costCoins: number;
}

const TYPE_LABELS: Record<RewardType, string> = {
  BADGE: "Insignia",
  AVATAR_FRAME: "Marco",
  TITLE: "Título",
};

const TYPE_COLORS: Record<RewardType, string> = {
  BADGE: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
  AVATAR_FRAME: "from-purple-500/20 to-pink-500/20 border-purple-500/30",
  TITLE: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",
};

const TYPE_BADGE_COLORS: Record<RewardType, string> = {
  BADGE: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  AVATAR_FRAME: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  TITLE: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
};

function TypeIcon({ type, className = "" }: { type: string; className?: string }) {
  switch (type) {
    case "BADGE": return <Award className={className} />;
    case "AVATAR_FRAME": return <Star className={className} />;
    case "TITLE": return <Type className={className} />;
    default: return <Package className={className} />;
  }
}

interface RewardCardProps {
  reward: Reward;
  owned: boolean;
  coins: number;
  onRedeem: (rewardId: number) => Promise<void>;
  redeeming: boolean;
}

function RewardCard({ reward, owned, coins, onRedeem, redeeming }: RewardCardProps) {
  const type = reward.type as RewardType;
  const canAfford = coins >= reward.costCoins;
  const gradientClass = TYPE_COLORS[type] ?? "from-gray-500/20 to-gray-500/20 border-gray-500/30";
  const badgeClass = TYPE_BADGE_COLORS[type] ?? "bg-gray-500/20 text-gray-400";

  return (
    <div
      className={`relative rounded-2xl border bg-gradient-to-br p-4 transition-all duration-300 ${gradientClass} ${
        owned ? "opacity-90" : canAfford ? "hover:scale-[1.02] hover:shadow-lg" : "opacity-60"
      }`}
    >
      {owned && (
        <div className="absolute right-3 top-3">
          <CheckCircle2 className="h-5 w-5 text-green-400" />
        </div>
      )}

      {/* Asset preview */}
      <div className="mb-3 flex items-center justify-center">
        {type === "BADGE" || type === "AVATAR_FRAME" ? (
          <span className="text-5xl leading-none" role="img" aria-label={reward.name}>
            {reward.assetValue}
          </span>
        ) : (
          <div className="rounded-lg bg-background/60 px-3 py-1.5">
            <span className="text-sm font-bold tracking-widest text-foreground/80 uppercase">
              {reward.assetValue}
            </span>
          </div>
        )}
      </div>

      {/* Type badge */}
      <div className="mb-2 flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
          <TypeIcon type={type} className="h-3 w-3" />
          {TYPE_LABELS[type] ?? type}
        </span>
      </div>

      <h3 className="font-heading text-lg leading-tight tracking-wide">{reward.name}</h3>
      {reward.description && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{reward.description}</p>
      )}

      {/* Cost + button */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Coins className="h-4 w-4 text-yellow-400" />
          <span className="text-sm font-bold text-yellow-400">{reward.costCoins}</span>
        </div>

        {owned ? (
          <span className="rounded-lg bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-400 border border-green-500/30">
            Poseído
          </span>
        ) : (
          <button
            id={`redeem-reward-${reward.id}`}
            onClick={() => onRedeem(reward.id)}
            disabled={!canAfford || redeeming}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              canAfford && !redeeming
                ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                : "cursor-not-allowed bg-muted text-muted-foreground"
            }`}
          >
            {redeeming ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : reward.costCoins === 0 ? (
              "Reclamar"
            ) : canAfford ? (
              "Canjear"
            ) : (
              "Sin fondos"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

const EQUIPPABLE_TYPES: RewardType[] = ["AVATAR_FRAME", "TITLE"];

interface OwnedRewardCardProps {
  reward: OwnedReward;
  equipped: boolean;
  onToggleEquip: (rewardId: number, type: RewardType, equip: boolean) => Promise<void>;
  toggling: boolean;
}

function OwnedRewardCard({ reward, equipped, onToggleEquip, toggling }: OwnedRewardCardProps) {
  const type = reward.type as RewardType;
  const gradientClass = TYPE_COLORS[type] ?? "from-gray-500/20 to-gray-500/20 border-gray-500/30";
  const canEquip = EQUIPPABLE_TYPES.includes(type);

  return (
    <div className={`flex items-center gap-3 rounded-xl border bg-gradient-to-br p-3 ${gradientClass}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background/40">
        {type === "TITLE" ? (
          <span className="text-xs font-bold text-foreground/80">{reward.assetValue.slice(0, 3)}</span>
        ) : (
          <span className="text-2xl leading-none">{reward.assetValue}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{reward.name}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(reward.redeemedAt).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>
      {canEquip ? (
        <button
          onClick={() => onToggleEquip(reward.rewardId, type, !equipped)}
          disabled={toggling}
          className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
            equipped
              ? "border border-green-500/30 bg-green-500/20 text-green-400 hover:bg-green-500/30"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          } ${toggling ? "opacity-60" : "active:scale-95"}`}
        >
          {toggling ? <Loader2 className="h-3 w-3 animate-spin" /> : equipped ? "Equipado" : "Equipar"}
        </button>
      ) : (
        <TypeIcon type={type} className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}
    </div>
  );
}

export function RewardsCatalog({
  initialCoins,
  initialEquippedFrameId = null,
  initialEquippedTitleId = null,
}: {
  initialCoins: number;
  initialEquippedFrameId?: number | null;
  initialEquippedTitleId?: number | null;
}) {
  const [activeTab, setActiveTab] = useState<"catalog" | "mine">("catalog");
  const [coins, setCoins] = useState(initialCoins);
  const [catalogRewards, setCatalogRewards] = useState<Reward[]>([]);
  const [ownedIds, setOwnedIds] = useState<number[]>([]);
  const [myRewards, setMyRewards] = useState<OwnedReward[]>([]);
  const [equippedFrameId, setEquippedFrameId] = useState<number | null>(initialEquippedFrameId);
  const [equippedTitleId, setEquippedTitleId] = useState<number | null>(initialEquippedTitleId);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await fetch("/api/rewards");
      if (!res.ok) return;
      const data = await res.json();
      setCatalogRewards(data.rewards ?? []);
      setOwnedIds(data.ownedIds ?? []);
    } catch {
      // silently fail
    }
  }, []);

  const fetchMine = useCallback(async () => {
    try {
      const res = await fetch("/api/rewards/mine");
      if (!res.ok) return;
      const data = await res.json();
      setMyRewards(data.rewards ?? []);
    } catch {
      // silently fail
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchCatalog(), fetchMine()]);
    setLoading(false);
  }, [fetchCatalog, fetchMine]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRedeem = async (rewardId: number) => {
    setError(null);
    setSuccessMsg(null);
    setRedeemingId(rewardId);

    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rewardId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al canjear la recompensa");
      } else {
        setCoins(data.remainingCoins);
        setSuccessMsg("¡Recompensa canjeada exitosamente!");
        await fetchAll();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setRedeemingId(null);
    }
  };

  const handleToggleEquip = async (rewardId: number, type: RewardType, equip: boolean) => {
    setError(null);
    setTogglingId(rewardId);

    try {
      const res = await fetch("/api/rewards/equip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rewardId, action: equip ? "equip" : "unequip" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al equipar la recompensa");
      } else if (type === "AVATAR_FRAME") {
        setEquippedFrameId(equip ? rewardId : null);
      } else if (type === "TITLE") {
        setEquippedTitleId(equip ? rewardId : null);
      }
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <ShoppingBag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-3xl tracking-wide">Tienda</h1>
            <p className="text-xs text-muted-foreground">Canjea tus monedas por recompensas</p>
          </div>
        </div>

        {/* Coin balance */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
          <Coins className="h-5 w-5 text-yellow-400" />
          <span className="text-sm text-muted-foreground">Tu saldo</span>
          <span className="ml-auto text-lg font-bold text-yellow-400">{coins} monedas</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        <button
          id="tab-catalog"
          onClick={() => setActiveTab("catalog")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${
            activeTab === "catalog"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Catálogo
        </button>
        <button
          id="tab-mine"
          onClick={() => setActiveTab("mine")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${
            activeTab === "mine"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Mis Recompensas
          {myRewards.length > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {myRewards.length}
            </span>
          )}
        </button>
      </div>

      {/* Feedback messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando recompensas...</p>
        </div>
      ) : activeTab === "catalog" ? (
        <div className="space-y-4">
          {catalogRewards.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No hay recompensas disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {catalogRewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  owned={ownedIds.includes(reward.id)}
                  coins={coins}
                  onRedeem={handleRedeem}
                  redeeming={redeemingId === reward.id}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {myRewards.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <Award className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">Aún no tienes recompensas</p>
              <button
                onClick={() => setActiveTab("catalog")}
                className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Explorar catálogo
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {myRewards.map((reward) => {
                const type = reward.type as RewardType;
                const equipped =
                  type === "AVATAR_FRAME"
                    ? equippedFrameId === reward.rewardId
                    : type === "TITLE"
                    ? equippedTitleId === reward.rewardId
                    : false;
                return (
                  <OwnedRewardCard
                    key={reward.id}
                    reward={reward}
                    equipped={equipped}
                    onToggleEquip={handleToggleEquip}
                    toggling={togglingId === reward.rewardId}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
