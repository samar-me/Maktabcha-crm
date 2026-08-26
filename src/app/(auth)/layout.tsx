import * as React from "react";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        {children}
      </div>
      <footer className="py-4 text-center text-xs text-muted-foreground">
        Maktabcha CRM &copy; {new Date().getFullYear()} — Barcha huquqlar himoyalangan.
      </footer>
    </div>
  );
}
