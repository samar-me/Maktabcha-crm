import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AuthGuard } from "@/components/layout/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userEmail = "admin@maktabcha.uz";
  const userName = "Bosh Administrator";

  return (
    <AuthGuard>
      <div className="min-h-screen flex bg-slate-50/50 dark:bg-slate-950 text-foreground">
        {/* Desktop Left Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header userEmail={userEmail} userName={userName} />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-12">
            {children}
          </main>

          {/* Mobile Navigation Bar & Drawer */}
          <MobileNav />
        </div>
      </div>
    </AuthGuard>
  );
}
