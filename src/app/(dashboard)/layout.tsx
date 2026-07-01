import { Navbar } from "@/components/navbar";
import { NotificationBell } from "@/components/notification-bell";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  return (
    <>
      {/* Top bar with notification bell */}
      {userId !== null && (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-end border-b border-border bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <NotificationBell userId={userId} />
        </header>
      )}
      <Navbar />
      <main
        className={`mx-auto max-w-[480px] px-4 pb-24 ${userId !== null ? "pt-16" : "pt-6"}`}
      >
        {children}
      </main>
    </>
  );
}
