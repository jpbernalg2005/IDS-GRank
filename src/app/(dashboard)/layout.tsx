import { Navbar } from "@/components/navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-lg px-4 pb-24 pt-6 md:pt-20">{children}</main>
    </>
  );
}
