"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Dumbbell, Trophy, UserRound, LogOut, Home, Users } from "lucide-react";

const navItems = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/rankings", label: "Rankings", icon: Trophy },
  { href: "/exercises", label: "Ejercicios", icon: Dumbbell },
  { href: "/groups", label: "Grupos", icon: Users },
  { href: "/plans", label: "Planes", icon: UserRound },
  { href: "/profile", label: "Perfil", icon: Users },
];

export function Navbar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:top-0 md:bottom-auto">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="fixed right-4 top-4 z-50 hidden md:block">
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Salir
        </button>
      </div>
    </>
  );
}
