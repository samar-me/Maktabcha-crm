"use client";

import {
  Student,
  Group,
  GroupStudent,
  Payment,
  Lesson,
  Attendance,
  AttendanceStatus,
  Homework,
  HomeworkSubmission,
  HomeworkStatus,
  Grade,
} from "@/types/database";
import {
  initialStudents,
  initialGroups,
  initialGroupStudents,
  initialPayments,
  initialLessons,
  initialAttendance,
  initialHomework,
  initialHomeworkSubmissions,
  initialGrades,
} from "./mock-data";

const STORAGE_KEYS = {
  STUDENTS: "maktabcha_students_v1",
  GROUPS: "maktabcha_groups_v1",
  GROUP_STUDENTS: "maktabcha_group_students_v1",
  PAYMENTS: "maktabcha_payments_v1",
  LESSONS: "maktabcha_lessons_v1",
  ATTENDANCE: "maktabcha_attendance_v1",
  HOMEWORK: "maktabcha_homework_v1",
  HOMEWORK_SUBMISSIONS: "maktabcha_hw_submissions_v1",
  GRADES: "maktabcha_grades_v1",
};

let memoryStudents = [...initialStudents];
let memoryGroups = [...initialGroups];
let memoryGroupStudents = [...initialGroupStudents];
let memoryPayments = [...initialPayments];
let memoryLessons = [...initialLessons];
let memoryAttendance = [...initialAttendance];
let memoryHomework = [...initialHomework];
let memoryHomeworkSubmissions = [...initialHomeworkSubmissions];
let memoryGrades = [...initialGrades];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export interface DebtorInfo {
  student: Student;
  groups: Group[];
  totalExpected: number;
  totalPaid: number;
  debtAmount: number;
  unpaidMonths: string[];
  lastPaymentDate: string | null;
}

export const crmStore = {
  // --- STUDENTS ---
  getStudents(): Student[] {
    if (isBrowser()) {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch {
          // fallback
        }
      }
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(initialStudents));
      return initialStudents;
    }
    return memoryStudents;
  },

  getStudentById(id: string): Student | undefined {
    return this.getStudents().find((s) => s.id === id);
  },

  saveStudent(studentData: Omit<Student, "id" | "created_at" | "updated_at"> & { id?: string }): Student {
    const list = this.getStudents();
    const now = new Date().toISOString();

    if (studentData.id) {
      const index = list.findIndex((s) => s.id === studentData.id);
      if (index !== -1) {
        const updated: Student = {
          ...list[index],
          ...studentData,
          updated_at: now,
        };
        list[index] = updated;
        if (isBrowser()) {
          localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(list));
        }
        memoryStudents = list;
        return updated;
      }
    }

    const newStudent: Student = {
      ...studentData,
      id: crypto.randomUUID ? crypto.randomUUID() : `st-${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    list.unshift(newStudent);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(list));
    }
    memoryStudents = list;
    return newStudent;
  },

  deleteStudent(id: string): boolean {
    let list = this.getStudents();
    list = list.filter((s) => s.id !== id);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(list));
    }
    memoryStudents = list;

    let gsList = this.getGroupStudents();
    gsList = gsList.filter((gs) => gs.student_id !== id);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.GROUP_STUDENTS, JSON.stringify(gsList));
    }
    memoryGroupStudents = gsList;

    let attList = this.getAttendance();
    attList = attList.filter((a) => a.student_id !== id);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attList));
    }
    memoryAttendance = attList;

    let subList = this.getHomeworkSubmissions();
    subList = subList.filter((s) => s.student_id !== id);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.HOMEWORK_SUBMISSIONS, JSON.stringify(subList));
    }
    memoryHomeworkSubmissions = subList;

    let grList = this.getGrades();
    grList = grList.filter((g) => g.student_id !== id);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(grList));
    }
    memoryGrades = grList;

    let pmtList = this.getPayments();
    pmtList = pmtList.filter((p) => p.student_id !== id);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(pmtList));
    }
    memoryPayments = pmtList;

    return true;
  },

  updateStudentStatus(id: string, status: Student["status"]): Student | undefined {
    const student = this.getStudentById(id);
    if (student) {
      return this.saveStudent({ ...student, status });
    }
    return undefined;
  },

  // --- GROUPS ---
  getGroups(): Group[] {
    if (isBrowser()) {
      const data = localStorage.getItem(STORAGE_KEYS.GROUPS);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch {
          // fallback
        }
      }
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(initialGroups));
      return initialGroups;
    }
    return memoryGroups;
  },

  getGroupById(id: string): Group | undefined {
    return this.getGroups().find((g) => g.id === id);
  },

  saveGroup(groupData: Omit<Group, "id" | "created_at" | "updated_at"> & { id?: string }): Group {
    const list = this.getGroups();
    const now = new Date().toISOString();

    if (groupData.id) {
      const index = list.findIndex((g) => g.id === groupData.id);
      if (index !== -1) {
        const updated: Group = {
          ...list[index],
          ...groupData,
          updated_at: now,
        };
        list[index] = updated;
        if (isBrowser()) {
          localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(list));
        }
        memoryGroups = list;
        return updated;
      }
    }

    const newGroup: Group = {
      ...groupData,
      id: crypto.randomUUID ? crypto.randomUUID() : `grp-${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    list.unshift(newGroup);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(list));
    }
    memoryGroups = list;
    return newGroup;
  },

  deleteGroup(id: string): boolean {
    let list = this.getGroups();
    list = list.filter((g) => g.id !== id);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(list));
    }
    memoryGroups = list;

    let gsList = this.getGroupStudents();
    gsList = gsList.filter((gs) => gs.group_id !== id);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.GROUP_STUDENTS, JSON.stringify(gsList));
    }
    memoryGroupStudents = gsList;

    return true;
  },

  // --- GROUP STUDENTS (ENROLLMENTS) ---
  getGroupStudents(): GroupStudent[] {
    if (isBrowser()) {
      const data = localStorage.getItem(STORAGE_KEYS.GROUP_STUDENTS);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch {
          // fallback
        }
      }
      localStorage.setItem(STORAGE_KEYS.GROUP_STUDENTS, JSON.stringify(initialGroupStudents));
      return initialGroupStudents;
    }
    return memoryGroupStudents;
  },

  getStudentsByGroupId(groupId: string): Student[] {
    const gsList = this.getGroupStudents().filter((gs) => gs.group_id === groupId && gs.status === "Faol");
    const studentIds = new Set(gsList.map((gs) => gs.student_id));
    return this.getStudents().filter((s) => studentIds.has(s.id));
  },

  getGroupsByStudentId(studentId: string): Group[] {
    const gsList = this.getGroupStudents().filter((gs) => gs.student_id === studentId && gs.status === "Faol");
    const groupIds = new Set(gsList.map((gs) => gs.group_id));
    return this.getGroups().filter((g) => groupIds.has(g.id));
  },

  addStudentToGroup(groupId: string, studentId: string): boolean {
    const list = this.getGroupStudents();
    const existing = list.find((gs) => gs.group_id === groupId && gs.student_id === studentId);
    if (existing) {
      if (existing.status !== "Faol") {
        existing.status = "Faol";
        if (isBrowser()) {
          localStorage.setItem(STORAGE_KEYS.GROUP_STUDENTS, JSON.stringify(list));
        }
        memoryGroupStudents = list;
      }
      return true;
    }

    const newGs: GroupStudent = {
      id: crypto.randomUUID ? crypto.randomUUID() : `gs-${Date.now()}`,
      group_id: groupId,
      student_id: studentId,
      joined_at: new Date().toISOString().split("T")[0],
      status: "Faol",
      created_at: new Date().toISOString(),
    };
    list.push(newGs);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.GROUP_STUDENTS, JSON.stringify(list));
    }
    memoryGroupStudents = list;
    return true;
  },

  removeStudentFromGroup(groupId: string, studentId: string): boolean {
    let list = this.getGroupStudents();
    list = list.filter((gs) => !(gs.group_id === groupId && gs.student_id === studentId));
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.GROUP_STUDENTS, JSON.stringify(list));
    }
    memoryGroupStudents = list;
    return true;
  },

  // --- LESSONS ---
  getLessons(groupId?: string): Lesson[] {
    if (isBrowser()) {
      const data = localStorage.getItem(STORAGE_KEYS.LESSONS);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return groupId ? parsed.filter((l: Lesson) => l.group_id === groupId) : parsed;
          }
        } catch {
          // fallback
        }
      }
      localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(initialLessons));
      return groupId ? initialLessons.filter((l) => l.group_id === groupId) : initialLessons;
    }
    return groupId ? memoryLessons.filter((l) => l.group_id === groupId) : memoryLessons;
  },

  getLessonById(id: string): Lesson | undefined {
    return this.getLessons().find((l) => l.id === id);
  },

  saveLesson(lessonData: Omit<Lesson, "id" | "created_at" | "updated_at"> & { id?: string }): Lesson {
    const list = this.getLessons();
    const now = new Date().toISOString();

    if (lessonData.id) {
      const index = list.findIndex((l) => l.id === lessonData.id);
      if (index !== -1) {
        const updated: Lesson = {
          ...list[index],
          ...lessonData,
          updated_at: now,
        };
        list[index] = updated;
        if (isBrowser()) {
          localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(list));
        }
        memoryLessons = list;
        return updated;
      }
    }

    const newLesson: Lesson = {
      ...lessonData,
      id: crypto.randomUUID ? crypto.randomUUID() : `ls-${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    list.unshift(newLesson);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(list));
    }
    memoryLessons = list;
    return newLesson;
  },

  deleteLesson(id: string): boolean {
    let list = this.getLessons();
    list = list.filter((l) => l.id !== id);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(list));
    }
    memoryLessons = list;

    let attList = this.getAttendance();
    attList = attList.filter((a) => a.lesson_id !== id);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attList));
    }
    memoryAttendance = attList;

    return true;
  },

  // --- ATTENDANCE ---
  getAttendance(lessonId?: string, groupId?: string, studentId?: string): Attendance[] {
    let list = memoryAttendance;
    if (isBrowser()) {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed;
          } else {
            list = initialAttendance;
            localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(initialAttendance));
          }
        } catch {
          list = initialAttendance;
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(initialAttendance));
        list = initialAttendance;
      }
    }

    return list.filter((a) => {
      if (lessonId && a.lesson_id !== lessonId) return false;
      if (groupId && a.group_id !== groupId) return false;
      if (studentId && a.student_id !== studentId) return false;
      return true;
    });
  },

  saveAttendanceBatch(
    lessonId: string,
    groupId: string,
    date: string,
    records: { student_id: string; status: AttendanceStatus; note?: string | null }[]
  ): Attendance[] {
    let list = this.getAttendance();
    const now = new Date().toISOString();
    const updatedOrCreated: Attendance[] = [];

    for (const rec of records) {
      const existingIdx = list.findIndex(
        (a) => a.lesson_id === lessonId && a.student_id === rec.student_id
      );

      if (existingIdx !== -1) {
        list[existingIdx] = {
          ...list[existingIdx],
          status: rec.status,
          note: rec.note || null,
          date: date,
          updated_at: now,
        };
        updatedOrCreated.push(list[existingIdx]);
      } else {
        const newAtt: Attendance = {
          id: crypto.randomUUID ? crypto.randomUUID() : `att-${Date.now()}-${Math.random()}`,
          lesson_id: lessonId,
          group_id: groupId,
          student_id: rec.student_id,
          date: date,
          status: rec.status,
          note: rec.note || null,
          created_at: now,
          updated_at: now,
        };
        list.push(newAtt);
        updatedOrCreated.push(newAtt);
      }
    }

    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(list));
    }
    memoryAttendance = list;
    return updatedOrCreated;
  },

  getStudentAttendanceStats(studentId: string) {
    const records = this.getAttendance(undefined, undefined, studentId);
    const total = records.length;
    if (total === 0) {
      return { total: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 100 };
    }
    const present = records.filter((r) => r.status === "Keldi").length;
    const late = records.filter((r) => r.status === "Kechikdi").length;
    const excused = records.filter((r) => r.status === "Sababli").length;
    const absent = records.filter((r) => r.status === "Kelmadi").length;

    const rate = Math.round(((present + late * 0.8 + excused) / total) * 100);
    return { total, present, absent, late, excused, rate: Math.min(100, rate) };
  },

  getGroupAttendanceStats(groupId: string) {
    const records = this.getAttendance(undefined, groupId, undefined);
    const total = records.length;
    if (total === 0) {
      return { total: 0, present: 0, absent: 0, late: 0, excused: 0, rate: 100 };
    }
    const present = records.filter((r) => r.status === "Keldi").length;
    const late = records.filter((r) => r.status === "Kechikdi").length;
    const excused = records.filter((r) => r.status === "Sababli").length;
    const absent = records.filter((r) => r.status === "Kelmadi").length;

    const rate = Math.round(((present + late * 0.8 + excused) / total) * 100);
    return { total, present, absent, late, excused, rate: Math.min(100, rate) };
  },

  // --- HOMEWORK ---
  getHomework(groupId?: string): Homework[] {
    if (isBrowser()) {
      const data = localStorage.getItem(STORAGE_KEYS.HOMEWORK);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          return groupId ? parsed.filter((h: Homework) => h.group_id === groupId) : parsed;
        } catch {
          // fallback
        }
      }
      localStorage.setItem(STORAGE_KEYS.HOMEWORK, JSON.stringify(initialHomework));
    }
    return groupId ? memoryHomework.filter((h) => h.group_id === groupId) : memoryHomework;
  },

  getHomeworkById(id: string): Homework | undefined {
    return this.getHomework().find((h) => h.id === id);
  },

  saveHomework(hwData: Omit<Homework, "id" | "created_at" | "updated_at"> & { id?: string }): Homework {
    const list = this.getHomework();
    const now = new Date().toISOString();

    if (hwData.id) {
      const index = list.findIndex((h) => h.id === hwData.id);
      if (index !== -1) {
        const updated: Homework = {
          ...list[index],
          ...hwData,
          updated_at: now,
        };
        list[index] = updated;
        if (isBrowser()) {
          localStorage.setItem(STORAGE_KEYS.HOMEWORK, JSON.stringify(list));
        }
        memoryHomework = list;
        return updated;
      }
    }

    const newHw: Homework = {
      ...hwData,
      id: crypto.randomUUID ? crypto.randomUUID() : `hw-${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    list.unshift(newHw);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.HOMEWORK, JSON.stringify(list));
    }
    memoryHomework = list;
    return newHw;
  },

  deleteHomework(id: string): boolean {
    let list = this.getHomework();
    list = list.filter((h) => h.id !== id);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.HOMEWORK, JSON.stringify(list));
    }
    memoryHomework = list;

    let subList = this.getHomeworkSubmissions();
    subList = subList.filter((s) => s.homework_id !== id);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.HOMEWORK_SUBMISSIONS, JSON.stringify(subList));
    }
    memoryHomeworkSubmissions = subList;

    return true;
  },

  // --- HOMEWORK SUBMISSIONS ---
  getHomeworkSubmissions(homeworkId?: string, studentId?: string): HomeworkSubmission[] {
    let list = memoryHomeworkSubmissions;
    if (isBrowser()) {
      const data = localStorage.getItem(STORAGE_KEYS.HOMEWORK_SUBMISSIONS);
      if (data) {
        try {
          list = JSON.parse(data);
        } catch {
          // fallback
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.HOMEWORK_SUBMISSIONS, JSON.stringify(initialHomeworkSubmissions));
      }
    }

    return list.filter((s) => {
      if (homeworkId && s.homework_id !== homeworkId) return false;
      if (studentId && s.student_id !== studentId) return false;
      return true;
    });
  },

  saveHomeworkSubmissionBatch(
    homeworkId: string,
    submissions: { student_id: string; status: HomeworkStatus; score?: number | null; feedback?: string | null }[]
  ): HomeworkSubmission[] {
    let list = this.getHomeworkSubmissions();
    const now = new Date().toISOString();
    const updatedOrCreated: HomeworkSubmission[] = [];

    for (const sub of submissions) {
      const existingIdx = list.findIndex(
        (s) => s.homework_id === homeworkId && s.student_id === sub.student_id
      );

      if (existingIdx !== -1) {
        list[existingIdx] = {
          ...list[existingIdx],
          status: sub.status,
          score: sub.score !== undefined ? sub.score : list[existingIdx].score,
          feedback: sub.feedback !== undefined ? sub.feedback : list[existingIdx].feedback,
          updated_at: now,
        };
        updatedOrCreated.push(list[existingIdx]);
      } else {
        const newSub: HomeworkSubmission = {
          id: crypto.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}-${Math.random()}`,
          homework_id: homeworkId,
          student_id: sub.student_id,
          status: sub.status,
          score: sub.score || null,
          feedback: sub.feedback || null,
          created_at: now,
          updated_at: now,
        };
        list.push(newSub);
        updatedOrCreated.push(newSub);
      }
    }

    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.HOMEWORK_SUBMISSIONS, JSON.stringify(list));
    }
    memoryHomeworkSubmissions = list;
    return updatedOrCreated;
  },

  getStudentHomeworkStats(studentId: string) {
    const submissions = this.getHomeworkSubmissions(undefined, studentId);
    const total = submissions.length;
    if (total === 0) {
      return { total: 0, completed: 0, partial: 0, notCompleted: 0, rate: 100 };
    }
    const completed = submissions.filter((s) => s.status === "Bajarildi").length;
    const partial = submissions.filter((s) => s.status === "Qisman").length;
    const notCompleted = submissions.filter((s) => s.status === "Bajarilmadi").length;
    const rate = Math.round(((completed + partial * 0.5) / total) * 100);

    return { total, completed, partial, notCompleted, rate };
  },

  // --- GRADES ---
  getGrades(groupId?: string, studentId?: string): Grade[] {
    let list = memoryGrades;
    if (isBrowser()) {
      const data = localStorage.getItem(STORAGE_KEYS.GRADES);
      if (data) {
        try {
          list = JSON.parse(data);
        } catch {
          // fallback
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(initialGrades));
      }
    }

    return list.filter((g) => {
      if (groupId && g.group_id !== groupId) return false;
      if (studentId && g.student_id !== studentId) return false;
      return true;
    });
  },

  getGradeById(id: string): Grade | undefined {
    return this.getGrades().find((g) => g.id === id);
  },

  saveGrade(gradeData: Omit<Grade, "id" | "created_at" | "updated_at"> & { id?: string }): Grade {
    const list = this.getGrades();
    const now = new Date().toISOString();

    if (gradeData.id) {
      const index = list.findIndex((g) => g.id === gradeData.id);
      if (index !== -1) {
        const updated: Grade = {
          ...list[index],
          ...gradeData,
          updated_at: now,
        };
        list[index] = updated;
        if (isBrowser()) {
          localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(list));
        }
        memoryGrades = list;
        return updated;
      }
    }

    const newGrade: Grade = {
      ...gradeData,
      id: crypto.randomUUID ? crypto.randomUUID() : `gr-${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    list.unshift(newGrade);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(list));
    }
    memoryGrades = list;
    return newGrade;
  },

  deleteGrade(id: string): boolean {
    let list = this.getGrades();
    list = list.filter((g) => g.id !== id);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(list));
    }
    memoryGrades = list;
    return true;
  },

  getStudentGradeStats(studentId: string) {
    const grades = this.getGrades(undefined, studentId);
    if (grades.length === 0) {
      return { total: 0, averageScore: 0, averagePercent: 0, grades: [] };
    }
    const totalScore = grades.reduce((acc, g) => acc + Number(g.score), 0);
    const totalMax = grades.reduce((acc, g) => acc + Number(g.max_score || 100), 0);
    const averageScore = Math.round(totalScore / grades.length);
    const averagePercent = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

    return { total: grades.length, averageScore, averagePercent, grades };
  },

  // --- PAYMENTS ---
  getPayments(groupId?: string, studentId?: string): Payment[] {
    let list = memoryPayments;
    if (isBrowser()) {
      const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed;
          } else {
            list = initialPayments;
            localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(initialPayments));
          }
        } catch {
          list = initialPayments;
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(initialPayments));
        list = initialPayments;
      }
    }

    return list.filter((p) => {
      if (groupId && p.group_id !== groupId) return false;
      if (studentId && p.student_id !== studentId) return false;
      return true;
    });
  },

  getPaymentById(id: string): Payment | undefined {
    return this.getPayments().find((p) => p.id === id);
  },

  getPaymentsByStudentId(studentId: string): Payment[] {
    return this.getPayments(undefined, studentId);
  },

  savePayment(paymentData: Omit<Payment, "id" | "created_at" | "updated_at"> & { id?: string }): Payment {
    const list = this.getPayments();
    const now = new Date().toISOString();

    if (paymentData.id) {
      const index = list.findIndex((p) => p.id === paymentData.id);
      if (index !== -1) {
        const updated: Payment = {
          ...list[index],
          ...paymentData,
          updated_at: now,
        };
        list[index] = updated;
        if (isBrowser()) {
          localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(list));
        }
        memoryPayments = list;
        return updated;
      }
    }

    const newPayment: Payment = {
      ...paymentData,
      id: crypto.randomUUID ? crypto.randomUUID() : `pmt-${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    list.unshift(newPayment);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(list));
    }
    memoryPayments = list;
    return newPayment;
  },

  deletePayment(id: string): boolean {
    let list = this.getPayments();
    list = list.filter((p) => p.id !== id);
    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(list));
    }
    memoryPayments = list;
    return true;
  },

  // --- DYNAMIC DEBTORS CALCULATION ---
  getDebtors(): DebtorInfo[] {
    const students = this.getStudents().filter((s) => s.status === "Faol");
    const debtors: DebtorInfo[] = [];

    for (const student of students) {
      const enrolledGroups = this.getGroupsByStudentId(student.id);
      if (enrolledGroups.length === 0) continue;

      const totalMonthlyFee = enrolledGroups.reduce(
        (acc, g) => acc + (Number(g.monthly_fee) || 0),
        0
      );

      const studentPayments = this.getPaymentsByStudentId(student.id);
      const totalPaid = studentPayments.reduce(
        (acc, p) => acc + (Number(p.amount) || 0),
        0
      );

      // Expected fee (e.g. for current month)
      const debtAmount = totalMonthlyFee - totalPaid;

      if (debtAmount > 0) {
        // Find unpaid months (e.g. Fevral 2025)
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const paidThisMonth = studentPayments.some(
          (p) => p.month === currentMonth && p.year === currentYear && Number(p.amount) >= totalMonthlyFee
        );

        const unpaidMonths: string[] = [];
        if (!paidThisMonth) {
          const monthNames = [
            "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
            "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
          ];
          unpaidMonths.push(`${monthNames[currentMonth - 1]} ${currentYear}`);
        }

        const lastPayment = studentPayments.sort(
          (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        )[0];

        debtors.push({
          student,
          groups: enrolledGroups,
          totalExpected: totalMonthlyFee,
          totalPaid,
          debtAmount,
          unpaidMonths,
          lastPaymentDate: lastPayment ? lastPayment.payment_date : null,
        });
      }
    }

    return debtors.sort((a, b) => b.debtAmount - a.debtAmount);
  },

  getMonthlyFinancialSummary() {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const allPayments = this.getPayments();
    const thisMonthPayments = allPayments.filter(
      (p) => p.month === currentMonth && p.year === currentYear
    );

    const totalCollected = thisMonthPayments.reduce((acc, p) => acc + Number(p.amount), 0);

    const activeGroupStudents = this.getGroupStudents().filter((gs) => gs.status === "Faol");
    const groups = this.getGroups();

    let totalExpected = 0;
    for (const gs of activeGroupStudents) {
      const grp = groups.find((g) => g.id === gs.group_id);
      if (grp) {
        totalExpected += Number(grp.monthly_fee) || 0;
      }
    }

    const debtors = this.getDebtors();
    const totalDebt = debtors.reduce((acc, d) => acc + d.debtAmount, 0);
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    return {
      currentMonth,
      currentYear,
      totalCollected,
      totalExpected,
      totalDebt,
      debtorsCount: debtors.length,
      collectionRate,
      paymentsCount: thisMonthPayments.length,
    };
  },

  // --- SECURITY, MASTER PASSWORD & PIN-CODE AUTH ---
  hasPinCode(): boolean {
    if (isBrowser()) {
      return Boolean(localStorage.getItem("maktabcha_security_pin_v1"));
    }
    return false;
  },

  getPinCode(): string | null {
    if (isBrowser()) {
      return localStorage.getItem("maktabcha_security_pin_v1");
    }
    return null;
  },

  setPinCode(pin: string): void {
    if (isBrowser()) {
      localStorage.setItem("maktabcha_security_pin_v1", pin.trim());
      localStorage.setItem("maktabcha_auth_session_v1", "active");
      document.cookie = "maktabcha_session=authenticated; path=/; max-age=604800; SameSite=Lax";
    }
  },

  verifyMasterPassword(password: string): boolean {
    const defaultMaster = "@Samar18";
    if (isBrowser()) {
      const customMaster = localStorage.getItem("maktabcha_master_pass_v1");
      if (customMaster) {
        return password.trim() === customMaster.trim();
      }
    }
    return password.trim() === defaultMaster;
  },

  setMasterPassword(newPassword: string): void {
    if (isBrowser()) {
      localStorage.setItem("maktabcha_master_pass_v1", newPassword.trim());
    }
  },

  verifyPinCode(pin: string): boolean {
    const currentPin = this.getPinCode();
    if (!currentPin) return false;
    return currentPin === pin.trim();
  },

  isAuthenticated(): boolean {
    if (isBrowser()) {
      const hasLocalSession = Boolean(localStorage.getItem("maktabcha_auth_session_v1"));
      const hasCookie = document.cookie.includes("maktabcha_session=authenticated");
      return hasLocalSession && hasCookie;
    }
    return false;
  },

  login(): void {
    if (isBrowser()) {
      localStorage.setItem("maktabcha_auth_session_v1", "active");
      document.cookie = "maktabcha_session=authenticated; path=/; max-age=604800; SameSite=Lax";
    }
  },

  logout(): void {
    if (isBrowser()) {
      localStorage.removeItem("maktabcha_auth_session_v1");
      document.cookie = "maktabcha_session=; path=/; max-age=0; SameSite=Lax";
    }
  },

  resetPinCode(): void {
    if (isBrowser()) {
      localStorage.removeItem("maktabcha_security_pin_v1");
      this.logout();
    }
  },
};


