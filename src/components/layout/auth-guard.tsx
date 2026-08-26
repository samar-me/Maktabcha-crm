"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { crmStore } from "@/services/crm-store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!crmStore.isAuthenticated()) {
      crmStore.logout();
      router.push("/login");
    }
  }, [pathname, router]);

  return <>{children}</>;
}
