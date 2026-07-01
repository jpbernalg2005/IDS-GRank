// Shared presentational pieces for rendering a user's equipped AVATAR_FRAME/TITLE
// rewards. No hooks/client-only APIs here so it can be used from both server
// components (profile) and client components (rankings, friends).

const FRAME_RING_STYLES: Record<string, string> = {
  "🔥": "from-orange-500 via-red-500 to-amber-400",
  "⚡": "from-yellow-400 via-blue-400 to-cyan-400",
  "🌌": "from-purple-600 via-indigo-500 to-fuchsia-500",
};
const DEFAULT_FRAME_RING = "from-primary via-primary/60 to-primary/20";

// Glow tinted to each frame's own gradient (keyed the same as FRAME_RING_STYLES),
// so the neon look matches the ring color instead of one generic glow for all frames.
const FRAME_GLOW_STYLES: Record<string, string> = {
  "🔥": "shadow-[0_0_16px_2px_rgba(249,115,22,0.55)]",
  "⚡": "shadow-[0_0_16px_2px_rgba(56,189,248,0.55)]",
  "🌌": "shadow-[0_0_16px_2px_rgba(168,85,247,0.55)]",
};
const DEFAULT_FRAME_GLOW = "shadow-[0_0_16px_2px_hsl(var(--primary)/0.45)]";

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
  // Opaque background when framed so the gradient wrapper only shows through the
  // thin p-[2px] ring, instead of bleeding through a translucent circle.
  const innerBg = frameAsset ? "bg-card" : "bg-primary/10";
  const circle = (
    <div className={`flex ${AVATAR_SIZES[size]} items-center justify-center rounded-full ${innerBg} font-bold text-primary`}>
      {label}
    </div>
  );

  if (!frameAsset) return circle;

  const ring = FRAME_RING_STYLES[frameAsset] ?? DEFAULT_FRAME_RING;
  const glow = FRAME_GLOW_STYLES[frameAsset] ?? DEFAULT_FRAME_GLOW;
  return <div className={`inline-flex rounded-full bg-gradient-to-br p-[2px] ${ring} ${glow}`}>{circle}</div>;
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
