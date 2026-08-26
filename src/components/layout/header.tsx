"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserNav } from "@/components/shared/user-nav";
import { Search, GraduationCap } from "lucide-react";
import { navItems } from "./sidebar";
import Link from "next/link";

interface HeaderProps {
  userEmail?: string;
  userName?: string;
}

export function Header({
  userEmail = "admin@maktabcha.uz",
  userName = "Administrator",
}: HeaderProps) {
  const pathname = usePathname();

  const currentNav = navItems.find(
    (item) =>
      item.href === pathname ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href))
  );

  const title = currentNav ? currentNav.title : "Boshqaruv paneli";

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Brand & Page Title */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm">Maktabcha</span>
        </Link>

        <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground text-base sm:text-lg">
            {title}
          </span>
        </div>
      </div>

      {/* Center: Search input */}
      <div className="hidden md:flex items-center relative max-w-sm w-full mx-4">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
        <input
          type="text"
          placeholder="O‘quvchi, guruh yoki telefon bo‘yicha qidirish..."
          className="w-full h-9 pl-9 pr-4 text-xs rounded-xl border border-input bg-muted/30 focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring transition-all placeholder:text-muted-foreground/70"
          readOnly
          onClick={() => {
            // Can trigger a command menu or focus
          }}
        />
      </div>

      {/* Right: Theme toggle & User navigation */}
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <div className="h-4 w-px bg-border hidden sm:block" />
        <UserNav userEmail={userEmail} userName={userName} />
      </div>
    </header>
  );
}
