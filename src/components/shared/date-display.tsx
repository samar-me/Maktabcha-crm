import * as React from "react";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface DateDisplayProps {
  date: string | Date | null | undefined;
  format?: string;
  className?: string;
}

export function DateDisplay({
  date,
  format = "dd.MM.yyyy",
  className,
}: DateDisplayProps) {
  const formatted = formatDate(date, format);

  return (
    <span className={cn("text-sm tabular-nums text-muted-foreground", className)}>
      {formatted}
    </span>
  );
}
