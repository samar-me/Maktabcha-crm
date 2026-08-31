import { createAdminClient } from "@/lib/supabase/admin";

export interface CrmExportBundle {
  filename: string;
  generatedAt: string;
  summary: {
    studentsCount: number;
    groupsCount: number;
    paymentsCount: number;
    lessonsCount: number;
    attendanceCount: number;
  };
  files: {
    name: string;
    content: string; // CSV or JSON string
  }[];
}

export async function generateFullCrmExport(): Promise<CrmExportBundle> {
  const supabase = createAdminClient();

  const [
    { data: students },
    { data: groups },
    { data: payments },
    { data: lessons },
    { data: attendance },
    { data: homework },
    { data: grades },
  ] = await Promise.all([
    supabase.from("students").select("id, first_name, last_name, phone, parent_name, parent_phone, birth_date, gender, address, joined_at, status, notes, created_at"),
    supabase.from("groups").select("id, name, course_name, teacher_name, teacher_phone, monthly_fee, room, start_date, end_date, status, created_at"),
    supabase.from("payments").select("id, student_id, group_id, amount, payment_date, payment_method, month, year, note, created_at"),
    supabase.from("lessons").select("id, group_id, date, start_time, end_time, topic, description, homework, status, created_at"),
    supabase.from("attendance").select("id, lesson_id, student_id, group_id, date, status, note, created_at"),
    supabase.from("homework").select("id, group_id, title, description, assigned_date, due_date, created_at"),
    supabase.from("grades").select("id, student_id, group_id, title, score, max_score, date, notes, created_at"),
  ]);

  const jsonToCsv = (data: any[]): string => {
    if (!data || data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(",")];
    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header];
        const escaped = ("" + (val ?? "")).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(","));
    }
    return csvRows.join("\n");
  };

  const files = [
    { name: "students.csv", content: jsonToCsv(students || []) },
    { name: "groups.csv", content: jsonToCsv(groups || []) },
    { name: "payments.csv", content: jsonToCsv(payments || []) },
    { name: "lessons.csv", content: jsonToCsv(lessons || []) },
    { name: "attendance.csv", content: jsonToCsv(attendance || []) },
    { name: "homework.csv", content: jsonToCsv(homework || []) },
    { name: "grades.csv", content: jsonToCsv(grades || []) },
    {
      name: "export-summary.json",
      content: JSON.stringify(
        {
          exporter: "Maktabcha Super Admin AI",
          exportDate: new Date().toISOString(),
          totalRecords: {
            students: (students || []).length,
            groups: (groups || []).length,
            payments: (payments || []).length,
            lessons: (lessons || []).length,
            attendance: (attendance || []).length,
          },
          securityNote: "Credentials, password hashes, and system tokens were safely excluded.",
        },
        null,
        2
      ),
    },
  ];

  return {
    filename: `maktabcha-crm-backup-${new Date().toISOString().slice(0, 10)}.json`,
    generatedAt: new Date().toISOString(),
    summary: {
      studentsCount: (students || []).length,
      groupsCount: (groups || []).length,
      paymentsCount: (payments || []).length,
      lessonsCount: (lessons || []).length,
      attendanceCount: (attendance || []).length,
    },
    files,
  };
}
