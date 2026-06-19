"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Trophy, UserRound, Home, Users, UserPlus } from "lucide-react";

const navItems = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/rankings", label: "Rankings", icon: Trophy },
  { href: "/exercises", label: "Ejercicios", icon: Dumbbell },
  { href: "/friends", label: "Amigos", icon: UserPlus },
  { href: "/groups", label: "Grupos", icon: Users },
  { href: "/profile", label: "Perfil", icon: UserRound },
];

export function Navbar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-[480px] items-center justify-around px-2 py-2">
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
  );
}
