import * as React from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  iconColorClass?: string;
  iconBgClass?: string;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  iconColorClass = "text-blue-600 dark:text-blue-400",
  iconBgClass = "bg-blue-50 dark:bg-blue-950/50",
  loading = false,
  className,
  onClick,
}: StatCardProps) {
  if (loading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden transition-all duration-200 border-border/80 bg-card hover:border-border shadow-sm",
        onClick && "cursor-pointer hover:shadow-md active:scale-[0.99]",
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={cn("p-2.5 rounded-xl flex items-center justify-center", iconBgClass)}>
            <Icon className={cn("w-5 h-5", iconColorClass)} />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
          {(subtitle || trend) && (
            <div className="flex items-center gap-2 mt-1">
              {trend && (
                <span
                  className={cn(
                    "text-xs font-semibold px-1.5 py-0.5 rounded",
                    trend.isPositive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                  )}
                >
                  {trend.value}
                </span>
              )}
              {subtitle && (
                <p className="text-xs text-muted-foreground line-clamp-1">{subtitle}</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
