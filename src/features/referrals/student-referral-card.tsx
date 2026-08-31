"use client";
import * as React from "react";
import { Copy, Gift, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Card,CardContent,CardHeader,CardTitle,CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getReferralSummaryAction } from "@/actions/referrals";

export function StudentReferralCard({studentId}:{studentId:string}){
 const [state,setState]=React.useState<any>(null);
 React.useEffect(()=>{getReferralSummaryAction(studentId).then(r=>r.success&&setState(r.data));},[studentId]);
 if(!state)return <Card><CardContent className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin"/></CardContent></Card>;
 return <Card className="border-violet-200 dark:border-violet-900"><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="flex items-center gap-2 text-base"><Gift className="w-5 h-5 text-violet-600"/>Referral</CardTitle><CardDescription>Takliflar va joriy chegirma</CardDescription></div><Button variant="outline" size="sm" onClick={()=>{navigator.clipboard.writeText(state.referralCode||"");toast.success("Kod nusxalandi")}}><Copy className="w-4 h-4 mr-2"/>{state.referralCode||"—"}</Button></div></CardHeader><CardContent>
  <div className="grid grid-cols-3 gap-3 mb-4"><div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3"><p className="text-xs text-muted-foreground">Successful</p><p className="text-xl font-bold text-emerald-600">{state.successful}</p></div><div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3"><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold text-amber-600">{state.pending}</p></div><div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 p-3"><p className="text-xs text-muted-foreground">Chegirma</p><p className="text-xl font-bold text-violet-600">{state.currentDiscount}%</p></div></div>
  {state.outgoing.length===0?<p className="text-sm text-muted-foreground">Hali takliflar yo‘q.</p>:<div className="space-y-2">{state.outgoing.map((r:any)=><div key={r.id} className="flex items-center justify-between border rounded-lg p-2.5 text-sm"><span className="flex items-center gap-2"><Users className="w-4 h-4"/>{r.referred?.first_name} {r.referred?.last_name}</span><span className={r.status==="pending"?"text-amber-600":"text-emerald-600"}>{r.status}</span></div>)}</div>}
 </CardContent></Card>;
}
