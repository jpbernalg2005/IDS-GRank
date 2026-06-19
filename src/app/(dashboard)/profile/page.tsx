import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = Number(session.user.id);
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl tracking-wide">Mi Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gestiona tu información personal</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
            {user.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="font-heading text-2xl tracking-wide">{user.username}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      <ProfileForm user={user} />
    </div>
  );
}
