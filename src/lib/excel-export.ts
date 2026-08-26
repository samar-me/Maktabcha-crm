import * as XLSX from "xlsx";
import { Student, Group, Payment, Attendance, Lesson } from "@/types/database";
import { DebtorInfo } from "@/services/debtors";
import { formatDate } from "./formatters";

export const excelExport = {
  /**
   * Export Students list to Excel
   */
  exportStudents(students: Student[], groups: Group[]) {
    const data = students.map((st, idx) => {
      return {
        "№": idx + 1,
        "Ismi": st.first_name,
        "Familiyasi": st.last_name || "—",
        "Telefon raqami": st.phone || "—",
        "Ota-onasi ismi": st.parent_name || "—",
        "Ota-onasi telefoni": st.parent_phone || "—",
        "Tug‘ilgan sanasi": st.birth_date ? formatDate(st.birth_date) : "—",
        "Jinsi": st.gender || "Erkak",
        "Manzili": st.address || "—",
        "Holati": st.status,
        "Qo‘shilgan sana": formatDate(st.joined_at),
        "Eslatmalar": st.notes || "—",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "O‘quvchilar");

    // Auto width
    worksheet["!cols"] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 15 },
      { wch: 10 },
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 30 },
    ];

    const fileName = `Oquvchilar_Royxati_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  },

  /**
   * Export Payments list to Excel
   */
  exportPayments(payments: Payment[], students: Student[], groups: Group[]) {
    const monthNames = [
      "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
      "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
    ];

    const data = payments.map((pmt, idx) => {
      const st = students.find((s) => s.id === pmt.student_id);
      const grp = groups.find((g) => g.id === pmt.group_id);

      return {
        "№": idx + 1,
        "Kvitansiya ID": `KVI-${pmt.year}-${String(pmt.month).padStart(2, "0")}-${pmt.id.slice(-4).toUpperCase()}`,
        "O‘quvchi": st ? `${st.first_name} ${st.last_name || ""}` : "Noma'lum",
        "Telefon": st?.phone || "—",
        "Guruh": grp?.name || "—",
        "Kurs nomi": grp?.course_name || "—",
        "To‘lov davri": `${monthNames[pmt.month - 1]} ${pmt.year}`,
        "To‘lov usuli": pmt.payment_method,
        "Summa (so‘m)": Number(pmt.amount),
        "To‘lov sanasi": formatDate(pmt.payment_date),
        "Izoh": pmt.note || "—",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "To‘lovlar");

    worksheet["!cols"] = [
      { wch: 5 },
      { wch: 20 },
      { wch: 22 },
      { wch: 18 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
    ];

    const fileName = `Tolovlar_Hisoboti_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  },

  /**
   * Export Debtors list to Excel
   */
  exportDebtors(debtors: DebtorInfo[]) {
    const data = debtors.map((d, idx) => {
      return {
        "№": idx + 1,
        "O‘quvchi": `${d.student.first_name} ${d.student.last_name || ""}`,
        "O‘quvchi telefoni": d.student.phone || "—",
        "Ota-onasi": d.student.parent_name || "—",
        "Ota-onasi telefoni": d.student.parent_phone || "—",
        "Guruh": d.group.name,
        "Oylik tarif (so‘m)": d.monthlyFee,
        "To‘langan (so‘m)": d.paidAmount,
        "Qarz summasi (so‘m)": d.debtAmount,
        "To‘lov davri": `${d.month}-oy, ${d.year}`,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Qarzdorlar");

    worksheet["!cols"] = [
      { wch: 5 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
    ];

    const fileName = `Qarzdorlar_Royxati_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  },

  /**
   * Export Attendance records to Excel
   */
  exportAttendance(attendance: Attendance[], students: Student[], lessons: Lesson[], group?: Group) {
    const data = attendance.map((att, idx) => {
      const st = students.find((s) => s.id === att.student_id);
      const ls = lessons.find((l) => l.id === att.lesson_id);

      return {
        "№": idx + 1,
        "Sana": formatDate(att.date),
        "O‘quvchi": st ? `${st.first_name} ${st.last_name || ""}` : "Noma'lum",
        "Guruh": group?.name || "—",
        "Dars mavzusi": ls?.topic || "—",
        "Davomat holati": att.status,
        "Izoh": att.note || "—",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Davomat");

    worksheet["!cols"] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 22 },
      { wch: 15 },
      { wch: 30 },
      { wch: 15 },
      { wch: 25 },
    ];

    const fileName = `Davomat_Hisoboti_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  },
};
