import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

/** GET /api/notifications
 * Returns the latest ~30 notifications for the authenticated user
 * plus the unread count.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  const userId = Number(session.user.id);

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(30);

  const unreadCount = rows.filter((n) => !n.isRead).length;

  return Response.json({ notifications: rows, unreadCount });
}

/** PUT /api/notifications
 * body: { action: "read", id: number }   → marks one notification as read
 * body: { action: "readAll" }            → marks all user notifications as read
 */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autorizado" }, { status: 401 });

  const userId = Number(session.user.id);
  const body = await req.json();
  const { action, id } = body as { action?: string; id?: number };

  if (action === "read") {
    if (!id) return Response.json({ error: "id requerido" }, { status: 400 });

    // Verify the notification belongs to the authenticated user
    const notification = await db.query.notifications.findFirst({
      where: eq(notifications.id, id),
    });

    if (!notification) return Response.json({ error: "Notificación no encontrada" }, { status: 404 });
    if (notification.userId !== userId) return Response.json({ error: "No autorizado" }, { status: 403 });

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

    return Response.json({ success: true });
  }

  if (action === "readAll") {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));

    return Response.json({ success: true });
  }

  return Response.json({ error: "Acción inválida" }, { status: 400 });
}
