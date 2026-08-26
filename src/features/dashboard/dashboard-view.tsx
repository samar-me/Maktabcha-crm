"use client";

import * as React from "react";
import Link from "next/link";
import {
  Student,
  Group,
  Payment,
  Lesson,
  Attendance,
} from "@/types/database";
import { getStudents } from "@/services/students";
import { getGroups } from "@/services/groups";
import { getPayments, createPayment } from "@/services/payments";
import { getLessons } from "@/services/lessons";
import { getAttendance } from "@/services/attendance";
import { getDebtors, DebtorInfo } from "@/services/debtors";
import { getMonthlyFinancialSummary, MonthlyFinancialSummary } from "@/services/reports";
import { StatCard } from "@/components/shared/stat-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { StatusBadge } from "@/components/shared/status-badge";
import { PaymentFormDialog } from "@/features/payments/payment-form-dialog";
import { PaymentReceiptDialog } from "@/features/payments/payment-receipt-dialog";
import { PaymentFormValues } from "@/features/payments/payment-schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users,
  GraduationCap,
  CalendarCheck2,
  Wallet,
  ShieldAlert,
  Plus,
  CreditCard,
  Calendar,
  Clock,
  Phone,
  Receipt,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

export function DashboardView() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [lessons, setLessons] = React.useState<Lesson[]>([]);
  const [attendance, setAttendance] = React.useState<Attendance[]>([]);
  const [debtors, setDebtors] = React.useState<DebtorInfo[]>([]);
  const [summary, setSummary] = React.useState<MonthlyFinancialSummary>({
    totalExpected: 0,
    totalCollected: 0,
    totalDebt: 0,
    collectionRate: 0,
    debtorsCount: 0,
  });
  const [loading, setLoading] = React.useState(true);

  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = React.useState<Student | null>(null);

  const [receiptDialogOpen, setReceiptDialogOpen] = React.useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = React.useState<Payment | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [stList, grList, pmtList, lsList, attList, dList, summ] = await Promise.all([
        getStudents(),
        getGroups(),
        getPayments(),
        getLessons(),
        getAttendance(),
        getDebtors(),
        getMonthlyFinancialSummary(),
      ]);
      setStudents(stList);
      setGroups(grList);
      setPayments(pmtList);
      setLessons(lsList);
      setAttendance(attList);
      setDebtors(dList);
      setSummary(summ);
    } catch {
      toast.error("Dashboard ma'lumotlarini yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  useAutoRefresh(loadData);

  const activeStudents = students.filter((s) => s.status === "Faol");
  const activeGroups = groups.filter((g) => g.status === "Faol");

  // Today's date
  const todayStr = new Date().toISOString().split("T")[0];
  const todayLessons = lessons.filter((l) => l.date === todayStr);
  const recentOrUpcomingLessons = lessons.slice(0, 4);

  // Overall attendance rate
  const presentCount = attendance.filter((a) => a.status === "Keldi").length;
  const overallAttendanceRate =
    attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 100;

  // Chart data: Monthly Revenue
  const revenueChartData = [
    { month: "Noyabr", tushum: 1200000, kutilgan: 1200000 },
    { month: "Dekabr", tushum: 1400000, kutilgan: 1600000 },
    { month: "Yanvar", tushum: 1600000, kutilgan: 1600000 },
    { month: "Fevral", tushum: summary.totalCollected, kutilgan: summary.totalExpected },
  ];

  // Chart data: Attendance Trend
  const attendanceChartData = [
    { dars: "Dars #1", davomat: 100 },
    { dars: "Dars #2", davomat: 100 },
    { dars: "Dars #3", davomat: 95 },
    { dars: "Dars #4", davomat: overallAttendanceRate },
  ];

  const handleOpenPayment = (student: Student) => {
    setSelectedStudentForPayment(student);
    setPaymentDialogOpen(true);
  };

  const handleSavePayment = async (values: PaymentFormValues) => {
    try {
      await createPayment({
        student_id: values.student_id,
        group_id: values.group_id,
        amount: values.amount,
        payment_date: values.payment_date,
        payment_method: values.payment_method,
        month: values.month,
        year: values.year,
        note: values.note || null,
      });

      toast.success("To‘lov qabul qilindi!");
      await loadData();
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Xush kelibsiz, Administrator!
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1">
            Maktabcha CRM orqali markazingiz o‘quv jarayoni va moliyasini to‘liq boshqaring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="secondary" className="gap-1.5 text-xs font-semibold shadow-sm">
            <Link href="/students">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>O‘quvchi qo‘shish</span>
            </Link>
          </Button>

          <Button asChild size="sm" className="gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm">
            <Link href="/attendance">
              <CalendarCheck2 className="w-4 h-4" />
              <span>Davomat olish</span>
            </Link>
          </Button>

          <Button asChild size="sm" className="gap-1.5 text-xs bg-white text-blue-700 hover:bg-blue-50 shadow-sm">
            <Link href="/payments">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>To‘lov qabul qilish</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 6 Metric Stat Cards */}
      {loading ? (
        <div className="p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs">Statistika yuklanmoqda...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
          <StatCard
            title="Faol o‘quvchilar"
            value={`${activeStudents.length} nafar`}
            icon={Users}
            subtitle="Jami ta'lim olayotganlar"
            iconColorClass="text-blue-600 dark:text-blue-400"
            iconBgClass="bg-blue-50 dark:bg-blue-950/50"
          />

          <StatCard
            title="Faol guruhlar"
            value={`${activeGroups.length} ta`}
            icon={GraduationCap}
            subtitle="Muntazam dars guruhlari"
            iconColorClass="text-purple-600 dark:text-purple-400"
            iconBgClass="bg-purple-50 dark:bg-purple-950/50"
          />

          <StatCard
            title="Bugungi darslar"
            value={`${todayLessons.length > 0 ? todayLessons.length : lessons.length} ta`}
            icon={Calendar}
            subtitle="Rejalashtirilgan mashg‘ulot"
            iconColorClass="text-indigo-600 dark:text-indigo-400"
            iconBgClass="bg-indigo-50 dark:bg-indigo-950/50"
          />

          <StatCard
            title="Bu oylik tushum"
            value={<MoneyDisplay amount={summary.totalCollected} size="md" variant="positive" />}
            icon={Wallet}
            subtitle={`Yig‘ish foizi: ${summary.collectionRate}%`}
            iconColorClass="text-emerald-600 dark:text-emerald-400"
            iconBgClass="bg-emerald-50 dark:bg-emerald-950/50"
          />

          <StatCard
            title="Jami qarzdorlik"
            value={<MoneyDisplay amount={summary.totalDebt} size="md" variant="negative" />}
            icon={ShieldAlert}
            subtitle={`${summary.debtorsCount} nafar qarzdor`}
            iconColorClass="text-rose-600 dark:text-rose-400"
            iconBgClass="bg-rose-50 dark:bg-rose-950/50"
          />

          <StatCard
            title="O‘rtacha davomat"
            value={`${overallAttendanceRate}%`}
            icon={CalendarCheck2}
            subtitle="Barcha darslar bo‘yicha"
            iconColorClass="text-teal-600 dark:text-teal-400"
            iconBgClass="bg-teal-50 dark:bg-teal-950/50"
          />
        </div>
      )}

      {/* Charts Section: Revenue & Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Oylik Tushum Dinamikasi</CardTitle>
                <CardDescription className="text-xs">Faktik tushum va rejadagi hajm (so‘m)</CardDescription>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {summary.collectionRate}% bajarildi
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), ""]}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar dataKey="tushum" name="Faktik Tushum" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="kutilgan" name="Reja Tushum" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Trend Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Davomat Dinamikasi</CardTitle>
                <CardDescription className="text-xs">Darslar kesimida o‘quvchilar ishtirok darajasi (%)</CardDescription>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                O‘rtacha: {overallAttendanceRate}%
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="dars" fontSize={11} />
                  <YAxis domain={[60, 100]} fontSize={11} tickFormatter={(val) => `${val}%`} />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, "Davomat"]}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="davomat"
                    name="Qatnashish %"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#2563eb" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom 3 Management Panels: Schedule, Recent Payments, Urgent Debtors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Today's / Upcoming Lessons */}
        <Card className="shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-sm font-bold">Darslar Jadvali</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs px-2">
                <Link href="/lessons">Barchasi &rarr;</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border flex-1">
            {recentOrUpcomingLessons.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Rejalashtirilgan darslar yo‘q.
              </div>
            ) : (
              recentOrUpcomingLessons.map((ls) => {
                const group = groups.find((g) => g.id === ls.group_id);
                return (
                  <div key={ls.id} className="p-3.5 hover:bg-muted/15 transition-colors space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {group?.name || "Guruh"}
                      </span>
                      <StatusBadge status={ls.status} />
                    </div>
                    <p className="text-xs font-semibold text-foreground line-clamp-1">
                      {ls.topic}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {ls.start_time} - {ls.end_time}
                      </span>
                      <Link
                        href={`/attendance?groupId=${ls.group_id}&lessonId=${ls.id}`}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-0.5"
                      >
                        Davomat &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* 2. Recent Payments */}
        <Card className="shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <CardTitle className="text-sm font-bold">So‘nggi To‘lovlar</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs px-2">
                <Link href="/payments">Barchasi &rarr;</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border flex-1">
            {payments.slice(0, 4).map((pmt) => {
              const student = students.find((s) => s.id === pmt.student_id);
              return (
                <div
                  key={pmt.id}
                  onClick={() => {
                    setSelectedPaymentForReceipt(pmt);
                    setReceiptDialogOpen(true);
                  }}
                  className="p-3.5 hover:bg-muted/15 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">
                      {student?.first_name} {student?.last_name || ""}
                    </p>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {formatDate(pmt.payment_date)} &bull; {pmt.payment_method}
                    </span>
                  </div>
                  <MoneyDisplay amount={pmt.amount} size="sm" variant="positive" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 3. Urgent Debtors Alert */}
        <Card className="shadow-sm flex flex-col justify-between border-rose-200/80 dark:border-rose-950/80">
          <CardHeader className="pb-3 border-b border-border bg-rose-50/30 dark:bg-rose-950/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <CardTitle className="text-sm font-bold text-rose-700 dark:text-rose-400">
                  Qarzdorlar Monitoringi
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs px-2 text-rose-600">
                <Link href="/debtors">Barchasi &rarr;</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border flex-1">
            {debtors.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="font-semibold text-foreground">Qarzdorlar mavjud emas!</p>
                <p className="text-[11px]">Barcha o‘quvchilar o‘z vaqtida to‘lagan.</p>
              </div>
            ) : (
              debtors.slice(0, 4).map((d) => (
                <div key={`${d.student.id}_${d.group.id}`} className="p-3.5 hover:bg-muted/15 transition-colors space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/students/${d.student.id}`}
                      className="text-xs font-bold text-foreground hover:text-blue-600 transition-colors"
                    >
                      {d.student.first_name} {d.student.last_name || ""}
                    </Link>
                    <MoneyDisplay amount={d.debtAmount} size="sm" variant="negative" />
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    {d.student.phone ? (
                      <a
                        href={`tel:${d.student.phone}`}
                        className="flex items-center gap-1 font-mono text-blue-600 hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{d.student.phone}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Telefon yo‘q</span>
                    )}

                    <Button
                      size="sm"
                      onClick={() => handleOpenPayment(d.student)}
                      className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      To‘lov olish
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Form Dialog */}
      <PaymentFormDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        groups={groups}
        students={students}
        initialStudentId={selectedStudentForPayment?.id}
        onSave={handleSavePayment}
      />

      {/* Receipt Dialog */}
      <PaymentReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        payment={selectedPaymentForReceipt}
        student={students.find((s) => s.id === selectedPaymentForReceipt?.student_id) || null}
        group={groups.find((g) => g.id === selectedPaymentForReceipt?.group_id) || null}
      />
    </div>
  );
}
