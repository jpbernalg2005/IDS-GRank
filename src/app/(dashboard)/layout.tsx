import { Navbar } from "@/components/navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[480px] px-4 pb-24 pt-6">{children}</main>
    </>
  );
}
