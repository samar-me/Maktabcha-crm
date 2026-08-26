export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StudentStatus = "Faol" | "Ta’til" | "Bitirgan" | "Tark etgan";
export type GroupStatus = "Faol" | "Yopilgan" | "Rejalashtirilgan";
export type GroupStudentStatus = "Faol" | "Chiqib ketgan";
export type LessonStatus = "Rejalashtirilgan" | "O‘tkazildi" | "Bekor qilindi";
export type AttendanceStatus = "Keldi" | "Kelmadi" | "Kechikdi" | "Sababli";
export type HomeworkStatus = "Berildi" | "Bajarildi" | "Qisman" | "Bajarilmadi";
export type PaymentMethod = "Naqd" | "Karta" | "O‘tkazma" | "Boshqa";
export type UserRole = "admin" | "teacher" | "staff";

export interface ScheduleItem {
  day: string; // e.g. "Dushanba"
  start_time: string; // e.g. "07:00"
  end_time: string; // e.g. "09:00"
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          first_name: string;
          last_name: string | null;
          phone: string | null;
          parent_name: string | null;
          parent_phone: string | null;
          birth_date: string | null;
          gender: "Erkak" | "Ayol" | null;
          address: string | null;
          joined_at: string;
          status: StudentStatus;
          notes: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name?: string | null;
          phone?: string | null;
          parent_name?: string | null;
          parent_phone?: string | null;
          birth_date?: string | null;
          gender?: "Erkak" | "Ayol" | null;
          address?: string | null;
          joined_at?: string;
          status?: StudentStatus;
          notes?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string | null;
          phone?: string | null;
          parent_name?: string | null;
          parent_phone?: string | null;
          birth_date?: string | null;
          gender?: "Erkak" | "Ayol" | null;
          address?: string | null;
          joined_at?: string;
          status?: StudentStatus;
          notes?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          course_name: string;
          teacher_name: string;
          monthly_fee: number;
          room: string | null;
          start_date: string;
          status: GroupStatus;
          schedule: ScheduleItem[] | Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          course_name: string;
          teacher_name: string;
          monthly_fee?: number;
          room?: string | null;
          start_date?: string;
          status?: GroupStatus;
          schedule?: ScheduleItem[] | Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          course_name?: string;
          teacher_name?: string;
          monthly_fee?: number;
          room?: string | null;
          start_date?: string;
          status?: GroupStatus;
          schedule?: ScheduleItem[] | Json;
          updated_at?: string;
        };
      };
      group_students: {
        Row: {
          id: string;
          group_id: string;
          student_id: string;
          joined_at: string;
          status: GroupStudentStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          student_id: string;
          joined_at?: string;
          status?: GroupStudentStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          student_id?: string;
          joined_at?: string;
          status?: GroupStudentStatus;
        };
      };
      lessons: {
        Row: {
          id: string;
          group_id: string;
          date: string;
          start_time: string;
          end_time: string;
          topic: string;
          description: string | null;
          homework: string | null;
          status: LessonStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          date: string;
          start_time: string;
          end_time: string;
          topic: string;
          description?: string | null;
          homework?: string | null;
          status?: LessonStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          topic?: string;
          description?: string | null;
          homework?: string | null;
          status?: LessonStatus;
          updated_at?: string;
        };
      };
      attendance: {
        Row: {
          id: string;
          lesson_id: string;
          student_id: string;
          group_id: string;
          date: string;
          status: AttendanceStatus;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          student_id: string;
          group_id: string;
          date: string;
          status: AttendanceStatus;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          student_id?: string;
          group_id?: string;
          date?: string;
          status?: AttendanceStatus;
          note?: string | null;
          updated_at?: string;
        };
      };
      homework: {
        Row: {
          id: string;
          group_id: string;
          lesson_id: string | null;
          title: string;
          description: string | null;
          assigned_date: string;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          lesson_id?: string | null;
          title: string;
          description?: string | null;
          assigned_date?: string;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          lesson_id?: string | null;
          title?: string;
          description?: string | null;
          assigned_date?: string;
          due_date?: string | null;
          updated_at?: string;
        };
      };
      homework_submissions: {
        Row: {
          id: string;
          homework_id: string;
          student_id: string;
          status: HomeworkStatus;
          score: number | null;
          feedback: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          homework_id: string;
          student_id: string;
          status?: HomeworkStatus;
          score?: number | null;
          feedback?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          homework_id?: string;
          student_id?: string;
          status?: HomeworkStatus;
          score?: number | null;
          feedback?: string | null;
          updated_at?: string;
        };
      };
      grades: {
        Row: {
          id: string;
          student_id: string;
          group_id: string;
          lesson_id: string | null;
          title: string;
          score: number;
          max_score: number;
          date: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          group_id: string;
          lesson_id?: string | null;
          title: string;
          score: number;
          max_score?: number;
          date: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          group_id?: string;
          lesson_id?: string | null;
          title?: string;
          score?: number;
          max_score?: number;
          date?: string;
          notes?: string | null;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          student_id: string;
          group_id: string;
          amount: number;
          payment_date: string;
          payment_method: PaymentMethod;
          month: number; // 1-12
          year: number; // e.g. 2025
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          group_id: string;
          amount: number;
          payment_date?: string;
          payment_method?: PaymentMethod;
          month: number;
          year: number;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          group_id?: string;
          amount?: number;
          payment_date?: string;
          payment_method?: PaymentMethod;
          month?: number;
          year?: number;
          note?: string | null;
          updated_at?: string;
        };
      };
      settings: {
        Row: {
          id: string;
          center_name: string;
          logo_url: string | null;
          admin_name: string;
          default_currency: string;
          default_monthly_fee: number;
          phone: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          center_name?: string;
          logo_url?: string | null;
          admin_name?: string;
          default_currency?: string;
          default_monthly_fee?: number;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          center_name?: string;
          logo_url?: string | null;
          admin_name?: string;
          default_currency?: string;
          default_monthly_fee?: number;
          phone?: string | null;
          address?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}

// Convenience Type aliases for application domain
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Student = Database["public"]["Tables"]["students"]["Row"];
export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type GroupStudent = Database["public"]["Tables"]["group_students"]["Row"];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type Homework = Database["public"]["Tables"]["homework"]["Row"];
export type HomeworkSubmission = Database["public"]["Tables"]["homework_submissions"]["Row"];
export type Grade = Database["public"]["Tables"]["grades"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type SystemSettings = Database["public"]["Tables"]["settings"]["Row"];
