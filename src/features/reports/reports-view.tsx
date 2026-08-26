"use client";

import * as React from "react";
import { Student, Group, Payment, Attendance, Lesson, GroupStudent } from "@/types/database";
import { getPayments } from "@/services/payments";
import { getGroups, getGroupStudents } from "@/services/groups";
import { getStudents } from "@/services/students";
import { getAttendance } from "@/services/attendance";
import { getLessons } from "@/services/lessons";
import { getDebtors, DebtorInfo } from "@/services/debtors";
import { getMonthlyFinancialSummary, MonthlyFinancialSummary } from "@/services/reports";
import { StatCard } from "@/components/shared/stat-card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  Wallet,
  CalendarCheck2,
  Users,
  CreditCard,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export function ReportsView() {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [enrollments, setEnrollments] = React.useState<GroupStudent[]>([]);
  const [attendance, setAttendance] = React.useState<Attendance[]>([]);
  const [lessons, setLessons] = React.useState<Lesson[]>([]);
  const [debtors, setDebtors] = React.useState<DebtorInfo[]>([]);
  const [summary, setSummary] = React.useState<MonthlyFinancialSummary>({
    totalExpected: 0,
    totalCollected: 0,
    totalDebt: 0,
    collectionRate: 0,
    debtorsCount: 0,
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const [pmtList, grpList, stList, enrList, attList, lsList, dList, summ] =
          await Promise.all([
            getPayments(),
            getGroups(),
            getStudents(),
            getGroupStudents(),
            getAttendance(),
            getLessons(),
            getDebtors(),
            getMonthlyFinancialSummary(),
          ]);

        setPayments(pmtList);
        setGroups(grpList);
        setStudents(stList);
        setEnrollments(enrList);
        setAttendance(attList);
        setLessons(lsList);
        setDebtors(dList);
        setSummary(summ);
      } catch (e) {
        console.error("Error loading reports data:", e);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  // 1. Revenue by Month
  const monthlyRevenueData = [
    { month: "Noyabr 2024", tushum: 1200000, kutilgan: 1200000 },
    { month: "Dekabr 2024", tushum: 1400000, kutilgan: 1600000 },
    { month: "Yanvar 2025", tushum: 1600000, kutilgan: 1600000 },
    { month: "Fevral 2025", tushum: summary.totalCollected, kutilgan: summary.totalExpected },
  ];

  // 2. Payment Method Breakdown (PieChart)
  const cardPayments = payments.filter((p) => p.payment_method === "Karta").reduce((acc, p) => acc + Number(p.amount), 0);
  const cashPayments = payments.filter((p) => p.payment_method === "Naqd").reduce((acc, p) => acc + Number(p.amount), 0);
  const transferPayments = payments.filter((p) => p.payment_method === "O‘tkazma").reduce((acc, p) => acc + Number(p.amount), 0);

  const paymentMethodsData = [
    { name: "Karta orqali", value: cardPayments || 800000, color: "#2563eb" },
    { name: "Naqd pulda", value: cashPayments || 400000, color: "#10b981" },
    { name: "O‘tkazma (Payme/Click)", value: transferPayments || 400000, color: "#8b5cf6" },
  ];

  // Group student count map
  const groupStudentCountMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const enr of enrollments) {
      if (enr.status === "Faol") {
        map.set(enr.group_id, (map.get(enr.group_id) || 0) + 1);
      }
    }
    return map;
  }, [enrollments]);

  // 3. Attendance by Group
  const groupAttendanceData = groups.map((g) => {
    const groupAtt = attendance.filter((a) => a.group_id === g.id);
    const present = groupAtt.filter((a) => a.status === "Keldi").length;
    const rate = groupAtt.length > 0 ? Math.round((present / groupAtt.length) * 100) : 100;
    return {
      name: g.name,
      davomat: rate,
      oqituvchi: g.teacher_name,
    };
  });

  // 4. Group Occupancy / Students Count
  const groupOccupancyData = groups.map((g) => {
    const studentCount = groupStudentCountMap.get(g.id) || 0;
    return {
      name: g.name,
      oquvchilar: studentCount,
      sigim: 15, // max capacity
    };
  });

  // 5. Student Growth by Month
  const studentGrowthData = [
    { month: "Noyabr", yangi: 2, jami: 2 },
    { month: "Dekabr", yangi: 1, jami: 3 },
    { month: "Yanvar", yangi: 1, jami: 4 },
    { month: "Fevral", yangi: 0, jami: students.length },
  ];

  // Overall attendance rate
  const totalAtt = attendance.length;
  const totalPresent = attendance.filter((a) => a.status === "Keldi").length;
  const overallAttRate = totalAtt > 0 ? Math.round((totalPresent / totalAtt) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* 4 Quick Stat Cards */}
      {loading ? (
        <div className="p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <p className="text-xs">Hisobotlar yuklanmoqda...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Jami tushum hajmi"
            value={<MoneyDisplay amount={summary.totalCollected} size="lg" variant="positive" />}
            icon={Wallet}
            subtitle={`Bu oy kutilgan: ${formatCurrency(summary.totalExpected)}`}
            iconColorClass="text-emerald-600 dark:text-emerald-400"
            iconBgClass="bg-emerald-50 dark:bg-emerald-950/50"
          />

          <StatCard
            title="Qarzdorlik miqdori"
            value={<MoneyDisplay amount={summary.totalDebt} size="lg" variant="negative" />}
            icon={CreditCard}
            subtitle={`${debtors.length} nafar qarzdor o‘quvchi`}
            iconColorClass="text-rose-600 dark:text-rose-400"
            iconBgClass="bg-rose-50 dark:bg-rose-950/50"
          />

          <StatCard
            title="O‘rtacha markaz davomati"
            value={`${overallAttRate}%`}
            icon={CalendarCheck2}
            subtitle="Barcha o‘tkazilgan darslar bo‘yicha"
            iconColorClass="text-blue-600 dark:text-blue-400"
            iconBgClass="bg-blue-50 dark:bg-blue-950/50"
          />

          <StatCard
            title="Faol o‘quvchilar soni"
            value={`${students.filter((s) => s.status === "Faol").length} nafar`}
            icon={Users}
            subtitle={`${groups.length} ta faol guruhda`}
            iconColorClass="text-purple-600 dark:text-purple-400"
            iconBgClass="bg-purple-50 dark:bg-purple-950/50"
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="finance" className="space-y-6">
        <TabsList className="grid grid-cols-3 max-w-lg">
          <TabsTrigger value="finance" className="gap-2">
            <Wallet className="w-4 h-4" />
            <span>Moliya</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <CalendarCheck2 className="w-4 h-4" />
            <span>Davomat</span>
          </TabsTrigger>
          <TabsTrigger value="growth" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            <span>O‘sish & Guruhlar</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Financial Reports */}
        <TabsContent value="finance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Revenue BarChart */}
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">Oylar Kesimida Tushumlar Dinamikasi</CardTitle>
                <CardDescription className="text-xs">Faktik to‘lovlar va oylik reja taqqoslanishi</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="month" fontSize={11} />
                      <YAxis fontSize={11} tickFormatter={(val) => `${val / 1000}k`} />
                      <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), ""]} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Bar dataKey="tushum" name="Faktik tushum" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="kutilgan" name="Kutilgan reja" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods PieChart */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">To‘lov Usullari Ulushi</CardTitle>
                <CardDescription className="text-xs">Karta, Naqd va O‘tkazmalar nisbati</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {paymentMethodsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                  {paymentMethodsData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Group Financial Breakdown Table / Mobile Cards */}
          <Card className="shadow-sm overflow-hidden border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Guruhlar Kesimida Moliyaviy Tahlil</CardTitle>
              <CardDescription className="text-xs">Har bir guruh bo‘yicha o‘quvchilar soni, tarif va tushum</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile Cards (md:hidden) */}
              <div className="divide-y divide-border md:hidden">
                {groups.map((grp) => {
                  const studentCount = groupStudentCountMap.get(grp.id) || 0;
                  const expected = studentCount * Number(grp.monthly_fee);
                  const groupPayments = payments.filter((p) => p.group_id === grp.id);
                  const collected = groupPayments.reduce((acc, p) => acc + Number(p.amount), 0);

                  return (
                    <div key={grp.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">{grp.name}</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(collected)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">O‘qituvchi: {grp.teacher_name}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/60">
                        <div>
                          <span className="text-[11px] text-muted-foreground block">O‘quvchilar:</span>
                          <span className="font-semibold text-foreground">{studentCount} nafar</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-muted-foreground block">Kutilgan:</span>
                          <span className="font-semibold text-foreground">{formatCurrency(expected)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Guruh nomi</th>
                      <th className="px-4 py-3 font-semibold">O‘qituvchi</th>
                      <th className="px-4 py-3 font-semibold">O‘quvchilar</th>
                      <th className="px-4 py-3 font-semibold">Oylik tarif</th>
                      <th className="px-4 py-3 font-semibold">Kutilayotgan summa</th>
                      <th className="px-6 py-3 font-semibold text-right">Faktik tushum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {groups.map((grp) => {
                      const studentCount = groupStudentCountMap.get(grp.id) || 0;
                      const expected = studentCount * Number(grp.monthly_fee);
                      const groupPayments = payments.filter((p) => p.group_id === grp.id);
                      const collected = groupPayments.reduce((acc, p) => acc + Number(p.amount), 0);

                      return (
                        <tr key={grp.id} className="hover:bg-muted/20">
                          <td className="px-6 py-3.5 font-bold text-foreground">{grp.name}</td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">{grp.teacher_name}</td>
                          <td className="px-4 py-3.5 font-semibold">{studentCount} nafar</td>
                          <td className="px-4 py-3.5 text-xs">{formatCurrency(grp.monthly_fee)}</td>
                          <td className="px-4 py-3.5 font-medium">{formatCurrency(expected)}</td>
                          <td className="px-6 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(collected)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Attendance Reports */}
        <TabsContent value="attendance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Group Attendance BarChart */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">Guruhlar Kesimida Davomat Foizi</CardTitle>
                <CardDescription className="text-xs">O‘rtacha ishtirok darajasi (%)</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={groupAttendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis domain={[50, 100]} fontSize={11} tickFormatter={(val) => `${val}%`} />
                      <Tooltip formatter={(val: any) => [`${val}%`, "Davomat foizi"]} />
                      <Bar dataKey="davomat" name="Davomat %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Status Distribution */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">Davomat Yozuvlari Nisbati</CardTitle>
                <CardDescription className="text-xs">Keldi, Kechikdi, Sababli va Kelmadi ulushi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-emerald-700 dark:text-emerald-400">Keldi (To‘liq ishtirok)</span>
                      <span>{overallAttRate}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${overallAttRate}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-amber-700 dark:text-amber-400">Kechikdi</span>
                      <span>0%</span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: "0%" }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-blue-700 dark:text-blue-400">Sababli</span>
                      <span>0%</span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: "0%" }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-rose-700 dark:text-rose-400">Kelmadi</span>
                      <span>{100 - overallAttRate}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${100 - overallAttRate}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Occupancy & Growth */}
        <TabsContent value="growth" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Group Occupancy */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">Guruhlar To‘laligi (Sig‘im)</CardTitle>
                <CardDescription className="text-xs">Hozirgi o‘quvchilar soni va xona sig‘imi (15 nafar)</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={groupOccupancyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Bar dataKey="oquvchilar" name="O‘quvchilar" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="sigim" name="Maksimal sig‘im" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Student Growth */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">O‘quvchilar Soni O‘sish Dinamikasi</CardTitle>
                <CardDescription className="text-xs">Oylar kesimida jami o‘quvchilar soni</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={studentGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="month" fontSize={11} />
                      <YAxis domain={[0, 6]} fontSize={11} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="jami"
                        name="Jami o‘quvchilar"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#10b981" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
