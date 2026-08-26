import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  StudentStatus,
  GroupStatus,
  AttendanceStatus,
  HomeworkStatus,
  PaymentMethod,
} from "@/types/database";

interface StatusBadgeProps {
  status:
    | StudentStatus
    | GroupStatus
    | AttendanceStatus
    | HomeworkStatus
    | PaymentMethod
    | string;
  type?: "student" | "group" | "attendance" | "homework" | "payment" | "custom";
}

export function StatusBadge({ status, type = "custom" }: StatusBadgeProps) {
  // Student Statuses: Faol, Ta’til, Bitirgan, Tark etgan
  if (status === "Faol" || status === "active") {
    return <Badge variant="success">Faol</Badge>;
  }
  if (status === "Ta’til" || status === "vacation") {
    return <Badge variant="warning">Ta’til</Badge>;
  }
  if (status === "Bitirgan" || status === "graduated") {
    return <Badge variant="info">Bitirgan</Badge>;
  }
  if (status === "Tark etgan" || status === "left") {
    return <Badge variant="destructive">Tark etgan</Badge>;
  }

  // Attendance Statuses: Keldi, Kelmadi, Kechikdi, Sababli
  if (status === "Keldi") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
        Keldi
      </span>
    );
  }
  if (status === "Kelmadi") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300">
        Kelmadi
      </span>
    );
  }
  if (status === "Kechikdi") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
        Kechikdi
      </span>
    );
  }
  if (status === "Sababli") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
        Sababli
      </span>
    );
  }

  // Homework Statuses: Berildi, Bajarildi, Qisman, Bajarilmadi
  if (status === "Bajarildi") {
    return <Badge variant="success">Bajarildi</Badge>;
  }
  if (status === "Qisman") {
    return <Badge variant="warning">Qisman</Badge>;
  }
  if (status === "Bajarilmadi") {
    return <Badge variant="destructive">Bajarilmadi</Badge>;
  }
  if (status === "Berildi") {
    return <Badge variant="secondary">Berildi</Badge>;
  }

  // Group Statuses: Yopilgan, Rejalashtirilgan
  if (status === "Yopilgan") {
    return <Badge variant="secondary">Yopilgan</Badge>;
  }
  if (status === "Rejalashtirilgan") {
    return <Badge variant="info">Rejalashtirilgan</Badge>;
  }

  // Default fallback
  return <Badge variant="outline">{status}</Badge>;
}
