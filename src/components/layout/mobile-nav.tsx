"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  CalendarCheck2,
  Menu,
  X,
  GraduationCap,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "./sidebar";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const primaryItems = [
    { title: "Bosh sahifa", href: "/dashboard", icon: LayoutDashboard },
    { title: "O‘quvchilar", href: "/students", icon: Users },
    { title: "Guruhlar", href: "/groups", icon: UsersRound },
    { title: "Davomat", href: "/attendance", icon: CalendarCheck2 },
  ];

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Tizimdan muvaffaqiyatli chiqildi");
      setDrawerOpen(false);
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Chiqishda xatolik yuz berdi");
    }
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile Drawer Menu */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-background border-r border-border p-4 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm block">Maktabcha CRM</span>
                <span className="text-xs text-muted-foreground">Barcha bo‘limlar</span>
              </div>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-600 text-white font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-muted-foreground")} />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-border space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-medium text-muted-foreground">Mavzu:</span>
            <ThemeToggle />
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Tizimdan chiqish</span>
          </button>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border lg:hidden px-2 py-1.5 safe-area-pb">
        <div className="grid grid-cols-5 items-center justify-around">
          {primaryItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all",
                  isActive
                    ? "text-blue-600 dark:text-blue-400 font-bold scale-105"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5 mb-0.5", isActive && "stroke-[2.5px]")} />
                <span className="text-[10px] leading-tight truncate">{item.title}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-1 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Menyu</span>
          </button>
        </div>
      </nav>
    </>
  );
}
