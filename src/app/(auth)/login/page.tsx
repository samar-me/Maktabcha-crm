import * as React from "react";
import { LoginForm } from "@/features/auth/login-form";
import { GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 hover:scale-105 transition-transform">
            <GraduationCap className="w-7 h-7" />
          </div>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Maktabcha CRM
        </h1>
        <p className="text-sm text-muted-foreground">
          O‘quv markaz administrator tizimiga kirish
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm text-card-foreground">
        <LoginForm />
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>Xavfsiz va shifrlangan ma'lumotlar</span>
      </div>
    </div>
  );
}
