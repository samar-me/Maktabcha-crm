"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, DollarSign, AlertCircle, Sparkles, UserCheck } from "lucide-react";
import { toast } from "sonner";

export function PaymentIntelligenceTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-500" />
          Payment Intelligence & Revenue Control
        </h2>
        <p className="text-sm text-muted-foreground">
          To'lovlar intizomi, grant / tekin o'qiyotganlar, kutilgan va tushgan daromadlar tahlili.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Kutilayotgan Oylik Daromad</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-500">14,500,000 so'm</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Jami Qarzdorlik</CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-500">1,200,000 so'm</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Grant / Tekin O'qiydiganlar</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-500">3 nafar</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Daromadga Qo'shilmaydilar</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-500">2 nafar</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            AI Billing Exceptions & Custom Financial Rules
          </CardTitle>
          <CardDescription>
            Foydalanuvchi UI'da yo'q bo'lgan billing qoidalarini AI orqali kiritishi mumkin (Masalan: "3 oy tekin o'qisin, paid ko'rinsin, daromadga qo'shilmasin").
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/40 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm">Ali Valiyev</span>
                <p className="text-xs text-muted-foreground">3 oy tekin o'qish (Grant Exception)</p>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                Active Exemption
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              To'lov statusi: <strong className="text-foreground">Paid (0 so'm)</strong> | IncludeInRevenue: <strong className="text-foreground">False</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
