"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-9 h-9 text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title={theme === "dark" ? "Yorug‘ rejimga o‘tish" : "Tungi rejimga o‘tish"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 transition-all text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 transition-all text-slate-700" />
      )}
      <span className="sr-only">Mavzuni almashtirish</span>
    </Button>
  );
}
