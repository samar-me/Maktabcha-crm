"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  CalendarCheck2,
  BookOpen,
  FileCheck2,
  Award,
  CreditCard,
  AlertCircle,
  TrendingUp,
  Settings,
  GraduationCap,
  ChevronRight,
  Lock,
  Target,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/actions/personal-auth";
import { toast } from "sonner";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const navItems: NavItem[] = [
  {
    title: "Bosh sahifa",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Topshiriqlar",
    href: "/assignments",
    icon: Target,
    badge: "Telegram",
  },
  {
    title: "O‘quvchilar",
    href: "/students",
    icon: Users,
  },
  {
    title: "Guruhlar",
    href: "/groups",
    icon: UsersRound,
  },
  {
    title: "Darslar",
    href: "/lessons",
    icon: BookOpen,
  },
  {
    title: "Ish reja",
    href: "/curriculum",
    icon: Layers,
  },
  {
    title: "Davomat",
    href: "/attendance",
    icon: CalendarCheck2,
  },
  {
    title: "Vazifalar",
    href: "/homework",
    icon: FileCheck2,
  },
  {
    title: "Baholar",
    href: "/grades",
    icon: Award,
  },
  {
    title: "To‘lovlar",
    href: "/payments",
    icon: CreditCard,
  },
  {
    title: "Qarzdorlar",
    href: "/debtors",
    icon: AlertCircle,
  },
  {
    title: "Hisobotlar",
    href: "/reports",
    icon: TrendingUp,
  },
  {
    title: "Sozlamalar",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await logoutAction();
      toast.success("Tizim qulflab qo‘yildi!");
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/60 backdrop-blur shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-border/80">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-foreground leading-none">
              Maktabcha
            </span>
            <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
              CRM tizimi
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Asosiy bo‘limlar
        </div>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all group",
                isActive
                  ? "bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isActive
                      ? "text-white"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span>{item.title}</span>
              </div>
              {item.badge ? (
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.badge}
                </span>
              ) : (
                isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-border/80">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-muted-foreground group-hover:text-rose-600" />
            <span>Tizimdan chiqish (Qulflash)</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
