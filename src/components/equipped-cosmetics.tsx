// Shared presentational pieces for rendering a user's equipped AVATAR_FRAME/TITLE
// rewards. No hooks/client-only APIs here so it can be used from both server
// components (profile) and client components (rankings, friends).

const FRAME_RING_STYLES: Record<string, string> = {
  "🔥": "from-orange-500 via-red-500 to-amber-400",
  "⚡": "from-yellow-400 via-blue-400 to-cyan-400",
  "🌌": "from-purple-600 via-indigo-500 to-fuchsia-500",
};
const DEFAULT_FRAME_RING = "from-primary via-primary/60 to-primary/20";

const AVATAR_SIZES = {
  sm: "h-10 w-10 text-sm",
  md: "h-16 w-16 text-2xl",
} as const;

export function AvatarWithFrame({
  label,
  frameAsset,
  size = "sm",
}: {
  label: string;
  frameAsset?: string | null;
  size?: keyof typeof AVATAR_SIZES;
}) {
  const circle = (
    <div className={`flex ${AVATAR_SIZES[size]} items-center justify-center rounded-full bg-primary/10 font-bold text-primary`}>
      {label}
    </div>
  );

  if (!frameAsset) return circle;

  const ring = FRAME_RING_STYLES[frameAsset] ?? DEFAULT_FRAME_RING;
  return <div className={`inline-flex rounded-full bg-gradient-to-br p-[2px] ${ring}`}>{circle}</div>;
}

export function TitleChip({ title, className = "" }: { title?: string | null; className?: string }) {
  if (!title) return null;
  return (
    <span
      className={`inline-flex items-center rounded-md border border-cyan-500/30 bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-400 ${className}`}
    >
      {title}
    </span>
  );
}
