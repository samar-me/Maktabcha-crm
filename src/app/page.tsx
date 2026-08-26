import Link from "next/link";
import { GraduationCap, ShieldCheck, ArrowRight, LayoutDashboard, Users, BookOpen, CreditCard } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">Maktabcha CRM</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium">
                v1.0
              </span>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
          >
            <span>Tizimga kirish</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-6">
          <ShieldCheck className="w-4 h-4" />
          <span>O‘quv markazni boshqarish tizimi</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight max-w-3xl mb-4 leading-tight">
          O‘quvchilar, guruhlar va to‘lovlarni professional boshqaring
        </h1>

        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mb-10 leading-relaxed">
          Davomat, uy vazifalari, baholar, to‘lovlar va qarzdorlik hisob-kitoblarini yagona qulay platformada avtomatlashtiring.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-base transition-all shadow-md hover:shadow-lg"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Boshqaruv paneliga o‘tish</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-base transition-colors"
          >
            <span>Administrator kirishi</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full text-left">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base mb-1">O‘quvchilar & Guruhlar</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              O‘quvchilar profili, dars jadvallari va guruh tarkiblarini to‘liq boshqaring.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base mb-1">Tezkor Davomat</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Bir necha soniyada butun guruh davomatini belgilash va statistikani ko‘rish.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base mb-1">To‘lovlar & Qarzdorlik</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Bo‘lib to‘lash, oylik to‘lovlar va qarzdor o‘quvchilar ro‘yxatini avtomatik aniqlash.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Maktabcha CRM — O‘quv markazlar uchun maxsus ishlab chiqilgan.
      </footer>
    </div>
  );
}
