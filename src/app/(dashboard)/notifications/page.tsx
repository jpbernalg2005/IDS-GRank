import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Notificaciones · GRank",
  description: "Centro de notificaciones de GRank",
};

/**
 * Pure function — all inputs are explicit, no impure calls inside.
 * `refMs` is the reference timestamp (captured at data-fetch time, outside the component).
 */
function timeAgo(date: Date, refMs: number): string {
  const diff = refMs - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = Number(session.user.id);

  // Capture reference timestamp before querying (deterministic for this render)
  const fetchedAt = new Date().getTime();

  const allNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));

  const unreadCount = allNotifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl tracking-wide flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          Notificaciones
        </h1>
        {unreadCount > 0 && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {unreadCount} sin leer
          </span>
        )}
      </div>

      {allNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center shadow-sm">
          <Bell className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No tienes notificaciones</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {allNotifications.map((n) => {
            const inner = (
              <div
                className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-colors ${
                  !n.isRead
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                    !n.isRead ? "bg-primary" : "bg-transparent"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold" : "font-medium"}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground/70">
                    {timeAgo(n.createdAt, fetchedAt)}
                  </p>
                </div>
              </div>
            );

            return (
              <li key={n.id}>
                {n.linkUrl ? (
                  <Link href={n.linkUrl} className="block">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
