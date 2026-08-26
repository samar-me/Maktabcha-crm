import * as React from "react";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface MoneyDisplayProps {
  amount: number | null | undefined;
  variant?: "default" | "positive" | "negative" | "neutral";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MoneyDisplay({
  amount,
  variant = "default",
  size = "md",
  className,
}: MoneyDisplayProps) {
  const formatted = formatCurrency(amount);

  return (
    <span
      className={cn(
        "font-semibold tracking-tight tabular-nums",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        size === "lg" && "text-lg font-bold",
        variant === "positive" && "text-emerald-600 dark:text-emerald-400",
        variant === "negative" && "text-rose-600 dark:text-rose-400",
        variant === "neutral" && "text-muted-foreground",
        className
      )}
    >
      {formatted}
    </span>
  );
}
