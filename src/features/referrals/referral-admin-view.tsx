"use client";

import * as React from "react";
import Link from "next/link";
import { Gift, Loader2, Plus, RefreshCw, Trophy } from "lucide-react";
import { toast } from "sonner";
import { cancelReferralAction, createReferralAdminAction, getReferralAdminOverviewAction, getReferralStudentOptionsAction } from "@/actions/referrals";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function ReferralAdminView() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [students, setStudents] = React.useState<any[]>([]);
  const [referrer, setReferrer] = React.useState("");
  const [referred, setReferred] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const result = await getReferralAdminOverviewAction();
    if (result.success) setData(result.data);
    else toast.error(result.error || "Referral ma’lumotlari yuklanmadi");
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function showCreate() {
    const result = await getReferralStudentOptionsAction();
    if (!result.success) return toast.error(result.error);
    setStudents(result.data || []);
    setReferrer("");
    setReferred("");
    setOpen(true);
  }

  async function create() {
    if (!referrer || !referred) return toast.error("Ikkala studentni tanlang");
    setSaving(true);
    const result = await createReferralAdminAction(referrer, referred);
    setSaving(false);
    if (!result.success) return toast.error(result.error);
    toast.success(result.message);
    setOpen(false);
    load();
  }

  async function cancel(referralId: string) {
    if (!window.confirm("Bu referral va unga bog‘liq faol chegirmani bekor qilasizmi?")) return;
    const result = await cancelReferralAction(referralId, "Admin tomonidan referral boshqaruvida bekor qilindi");
    if (!result.success) return toast.error(result.error);
    toast.success("Referral bekor qilindi");
    load();
  }

  if (loading && !data) return <div className="p-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-violet-600" /></div>;
  const metrics = data?.metrics || {};
  const metricItems = [
    ["Bu oy", metrics.monthTotal || 0], ["Qualified", metrics.qualified || 0], ["Pending", metrics.pending || 0],
    ["Referral revenue", `${Number(metrics.revenue || 0).toLocaleString()} so‘m`],
    ["Berilgan discount", `${Number(metrics.discount || 0).toLocaleString()} so‘m`],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Gift className="w-7 h-7 text-violet-600" />Referral Program</h1><p className="text-sm text-muted-foreground mt-1">Takliflar, mukofotlar va referral natijalarini boshqarish</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />Yangilash</Button><Button onClick={showCreate}><Plus className="w-4 h-4 mr-2" />Referral qo‘shish</Button></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{metricItems.map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="font-bold mt-2">{value}</p></CardContent></Card>)}</div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">Barcha referrallar</CardTitle><CardDescription>Pending va muvaffaqiyatli takliflar tarixi</CardDescription></CardHeader><CardContent className="p-0"><div className="divide-y">
          {!data?.referrals?.length ? <div className="p-8 text-center"><p className="text-sm text-muted-foreground">Hali referral mavjud emas.</p><Button size="sm" className="mt-3" onClick={showCreate}><Plus className="w-4 h-4 mr-2" />Birinchi referralni qo‘shish</Button></div> : data.referrals.map((row: any) => <div key={row.id} className="p-4 flex items-center justify-between gap-3"><p className="text-sm"><Link className="font-semibold hover:text-violet-600" href={`/students/${row.referrer?.id}`}>{row.referrer?.first_name} {row.referrer?.last_name}</Link><span className="mx-2 text-muted-foreground">→</span><Link className="font-semibold hover:text-violet-600" href={`/students/${row.referred?.id}`}>{row.referred?.first_name} {row.referred?.last_name}</Link></p><div className="flex items-center gap-2"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${row.status === "pending" ? "bg-amber-100 text-amber-700" : row.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{row.status}</span>{row.status !== "cancelled" && <Button size="sm" variant="outline" onClick={() => cancel(row.id)}>Bekor qilish</Button>}</div></div>)}
        </div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />Leaderboard</CardTitle></CardHeader><CardContent className="space-y-2">{!data?.leaderboard?.length ? <p className="text-sm text-muted-foreground">Natijalar yo‘q.</p> : data.leaderboard.map((row: any, index: number) => <Link href={`/students/${row.studentId}`} key={row.studentId} className="flex justify-between border rounded-xl p-3"><span className="text-sm font-semibold">{index + 1}. {row.name}</span><b className="text-violet-600">{row.count}</b></Link>)}</CardContent></Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>Yangi referral qo‘shish</DialogTitle><DialogDescription>Taklif qilgan va taklif orqali kelgan studentni tanlang.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Taklif qilgan student</Label><select className="w-full h-10 border rounded-md bg-background px-3 text-sm" value={referrer} onChange={(e) => setReferrer(e.target.value)}><option value="">Tanlang...</option>{students.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name || ""} — {s.referral_code}</option>)}</select></div>
            <div className="space-y-2"><Label>Taklif orqali kelgan student</Label><select className="w-full h-10 border rounded-md bg-background px-3 text-sm" value={referred} onChange={(e) => setReferred(e.target.value)}><option value="">Tanlang...</option>{students.filter((s) => s.id !== referrer).map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name || ""} {s.phone ? `— ${s.phone}` : ""}</option>)}</select></div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300">Referral avval pending bo‘ladi. Yangi student qualification shartini bajargach chegirma avtomatik beriladi.</div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Bekor qilish</Button><Button onClick={create} disabled={saving || !referrer || !referred}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Referral yaratish</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
