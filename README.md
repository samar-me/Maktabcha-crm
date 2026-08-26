# Maktabcha CRM 🎓

Maktabcha CRM — O‘quv markazlari, xususiy maktablar va kurslar faoliyatini boshqarish uchun ishlab chiqilgan zamonaviy, tezkor va xavfsiz SaaS CRM tizimi.

---

## 🌟 Asosiy Imkoniyatlar

- 👥 **O‘quvchilar Boshqaruvi (`/students`)**: O‘quvchilar ro‘yxati, qidiruv, 4 ta holat filtri (*Faol, Ta’til, Bitirgan, Tark etgan*), shaxsiy profil, to‘lovlar tarixi, qarzdorlik va akademik natijalar.
- 🏫 **Guruhlar Boshqaruvi (`/groups`)**: Ko‘p kunlik dars jadvali konstruktori (*Dushanba, Chorshanba, Juma*), oylik to‘lov tarifi, guruh tarkibiga o‘quvchi qo‘shish/chiqarish va kutilayotgan tushum hisob-kitobi.
- 📅 **Darslar Jurnali (`/lessons`)**: Rejalashtirilgan va o‘tkazilgan darslar, dars mavzulari, uy vazifalari va dars tafsilotlari.
- ⚡ **Tezkor Davomat Oqimi (`/attendance`)**: Guruh &rarr; Dars &rarr; Sana tanlash, **"Barchasi keldi"** ommaviy amali, 4 ta rangli holat (*Keldi, Kelmadi, Kechikdi, Sababli*), sabab/izohlar va dublikatdan to‘liq himoya.
- 📝 **Uy Vazifalari & Baholash (`/homework`, `/grades`)**: Topshiriqlar berish, topshirish muddati progress bari, tezkor baholash modali, sinov ballari va avtomatik foiz hisoblash (*96/100 &rarr; 96%*).
- 💳 **To‘lovlar & Rasmiy Kvitansiya (`/payments`)**: To‘lov qabul qilish (*Karta, Naqd, O‘tkazma*), oylik tarif presetsi va chop etiladigan rasmiy to‘lov kvitansiyasi.
- ⚠️ **Dinamik Qarzdorlar Monitoringi (`/debtors`)**: Haqiqiy to‘lovlar va tarif asosida avtomatik hisoblangan qarzdorlik, to‘lanmagan davrlar, to‘g‘ridan-to‘g‘ri qo‘ng‘iroq qilish va tezkor to‘lov qabul qilish.
- 📊 **Dashboard & Tahliliy Hisobotlar (`/dashboard`, `/reports`)**: 6 ta asosiy metrika kartalari, Recharts oylik tushum va davomat dinamikasi grafiklari, to‘lov usullari aylanma grafigi (*PieChart*), guruhlar sig‘imi.
- 📑 **Excel Eksport (`xlsx`)**: O‘quvchilar, to‘lovlar, qarzdorlar va guruh ro‘yxatlarini `.xlsx` formatida yuklab olish.
- 🎨 **Mavzular**: Yorug‘ (Light), Tungi (Dark) va Tizim (System) rejimlari.

---

## 🛠️ Texnologiyalar Steki

- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router, Server & Client Components)
- **Til**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Stillar & UI**: [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [Lucide Icons](https://lucide.dev/)
- **Baza & Auth**: [Supabase](https://supabase.com/) (PostgreSQL + RLS Security Policies)
- **Formalar & Validatsiya**: [React Hook Form](https://react-hook-form.com/), [Zod](https://zod.dev/)
- **Grafiklar**: [Recharts](https://recharts.org/)
- **Eksport**: [XLSX](https://sheetjs.com/)
- **Bildirishnomalar**: [Sonner](https://sonner.emilkowal.ski/)
- **Sana & Valyuta formatlash**: [date-fns](https://date-fns.org/)

---

## 🚀 Ishga Tushirish

### 1. Loyihani yuklab olish:
```bash
git clone https://github.com/samar-me/Maktabcha-crm.git
cd Maktabcha-crm
```

### 2. Bog‘liqliklarni o‘rnatish:
```bash
npm install
```

### 3. Serverni ishga tushirish:
```bash
npm run dev
```

Brauzerda oching:
👉 **[http://localhost:3000](http://localhost:3000)**

### 4. Ishlab chiqarishga qurish (Production Build):
```bash
npm run build
npm run start
```

---

## 🔑 Tizimga Kirish Ma'lumotlari

- **Email:** `admin@maktabcha.uz`
- **Parol:** `admin12345`

---

## 📄 Litsenziya

MIT License &copy; 2025 Maktabcha CRM.
