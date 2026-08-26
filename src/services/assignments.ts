import { createAdminClient } from "@/lib/supabase/admin";
import {
  Assignment,
  AssignmentDetailWithQuestions,
  AdminParticipantProgress,
  QuestionDraft,
} from "@/types/assignment";
import { generatePublicAssignmentToken } from "@/lib/student-crypto";
import { sendTelegramMessage, getTelegramConfig } from "@/lib/telegram/bot";

/**
 * Get list of assignments with aggregated metrics
 */
export async function getAssignments(filters?: {
  groupId?: string;
  status?: string;
}) {
  const supabase = createAdminClient();
  let query = supabase
    .from("assignments")
    .select("*, groups(name, course_name)")
    .order("created_at", { ascending: false });

  if (filters?.groupId && filters.groupId !== "all") {
    query = query.eq("group_id", filters.groupId);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status as any);
  }

  const { data: assignments, error } = await query;
  if (error) throw new Error(error.message);

  // Fetch counts for questions, participants, attempts in parallel
  const assignmentIds = (assignments || []).map((a) => a.id);

  if (assignmentIds.length === 0) return [];

  const [questionsRes, participantsRes, attemptsRes, linksRes] = await Promise.all([
    supabase.from("assignment_questions").select("assignment_id"),
    supabase.from("assignment_participants").select("assignment_id"),
    supabase.from("assignment_attempts").select("assignment_id, status"),
    supabase.from("telegram_group_links").select("group_id, telegram_chat_title, status"),
  ]);

  const questionCountMap = new Map<string, number>();
  for (const q of questionsRes.data || []) {
    questionCountMap.set(q.assignment_id, (questionCountMap.get(q.assignment_id) || 0) + 1);
  }

  const participantCountMap = new Map<string, number>();
  for (const p of participantsRes.data || []) {
    participantCountMap.set(p.assignment_id, (participantCountMap.get(p.assignment_id) || 0) + 1);
  }

  const completedCountMap = new Map<string, number>();
  for (const att of attemptsRes.data || []) {
    if (att.status === "completed") {
      completedCountMap.set(att.assignment_id, (completedCountMap.get(att.assignment_id) || 0) + 1);
    }
  }

  const groupLinkMap = new Map<string, string>();
  for (const l of linksRes.data || []) {
    if (l.status === "Faol") {
      groupLinkMap.set(l.group_id, l.telegram_chat_title);
    }
  }

  return (assignments || []).map((a) => ({
    ...a,
    group_name: (a as any).groups?.name || "Guruh",
    course_name: (a as any).groups?.course_name || "",
    question_count: questionCountMap.get(a.id) || 0,
    participant_count: participantCountMap.get(a.id) || 0,
    completed_count: completedCountMap.get(a.id) || 0,
    telegram_group_title: groupLinkMap.get(a.group_id) || null,
  }));
}

/**
 * Get full assignment details with questions, options, participants, and progress
 */
export async function getAssignmentById(id: string): Promise<AssignmentDetailWithQuestions | null> {
  const supabase = createAdminClient();

  const { data: assignment, error: assErr } = await supabase
    .from("assignments")
    .select("*, groups(id, name, course_name)")
    .eq("id", id)
    .maybeSingle();

  if (assErr || !assignment) return null;

  // Fetch questions with options ordered by position
  const { data: questions } = await supabase
    .from("assignment_questions")
    .select("*, question_options(*)")
    .eq("assignment_id", id)
    .order("position", { ascending: true });

  const sortedQuestions = (questions || []).map((q: any) => ({
    ...q,
    options: (q.question_options || []).sort((a: any, b: any) => a.position - b.position),
  }));

  // Fetch participants
  const { data: participants } = await supabase
    .from("assignment_participants")
    .select("*")
    .eq("assignment_id", id);

  // Fetch linked Telegram group
  const { data: telegramLink } = await supabase
    .from("telegram_group_links")
    .select("*")
    .eq("group_id", assignment.group_id)
    .maybeSingle();

  // Fetch attempts for stats
  const { data: attempts } = await supabase
    .from("assignment_attempts")
    .select("*")
    .eq("assignment_id", id);

  const totalParticipants = participants?.length || 0;
  const completedCount = attempts?.filter((a) => a.status === "completed").length || 0;
  const inProgressCount = attempts?.filter((a) => a.status === "in_progress").length || 0;
  const notStartedCount = Math.max(0, totalParticipants - (attempts?.length || 0));

  const completedAttempts = attempts?.filter((a) => a.status === "completed") || [];
  const averageScore =
    completedAttempts.length > 0
      ? Math.round(
          completedAttempts.reduce((sum, a) => sum + (a.raw_score || 0), 0) /
            completedAttempts.length
        )
      : 0;

  return {
    ...assignment,
    groupName: (assignment as any).groups?.name || "Guruh",
    questions: sortedQuestions,
    participants: participants || [],
    telegramLink: telegramLink?.status === "Faol" ? telegramLink : null,
    stats: {
      totalParticipants,
      completedCount,
      inProgressCount,
      notStartedCount,
      averageScore,
    },
  };
}

/**
 * Create new assignment with questions
 */
export async function createAssignment(data: {
  groupId: string;
  title: string;
  description?: string;
  scoringBasePoints?: number;
  scoringRankStep?: number;
  scoringMinPoints?: number;
  antiCheatMode?: boolean;
  questions: QuestionDraft[];
}) {
  const supabase = createAdminClient();
  const publicToken = generatePublicAssignmentToken();

  // 1. Insert assignment
  const { data: assignment, error: assErr } = await supabase
    .from("assignments")
    .insert({
      group_id: data.groupId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      public_token: publicToken,
      status: "Qoralama",
      scoring_base_points: data.scoringBasePoints || 1000,
      scoring_rank_step: data.scoringRankStep || 100,
      scoring_min_points: data.scoringMinPoints || 100,
      anti_cheat_mode: data.antiCheatMode ?? true,
    })
    .select("id")
    .single();

  if (assErr || !assignment) {
    throw new Error(assErr?.message || "Topshiriqni saqlashda xatolik");
  }

  // 2. Insert questions and options
  for (let i = 0; i < data.questions.length; i++) {
    const q = data.questions[i];
    const { data: createdQ, error: qErr } = await supabase
      .from("assignment_questions")
      .insert({
        assignment_id: assignment.id,
        position: i + 1,
        question_text: q.questionText.trim(),
      })
      .select("id")
      .single();

    if (qErr || !createdQ) throw new Error(qErr?.message || "Savolni saqlashda xatolik");

    const optionInserts = q.options.map((opt, optIndex) => ({
      question_id: createdQ.id,
      position: optIndex + 1,
      option_text: opt.optionText.trim(),
      is_correct: opt.isCorrect,
    }));

    const { error: optErr } = await supabase.from("question_options").insert(optionInserts);
    if (optErr) throw new Error(optErr.message);
  }

  return assignment.id;
}

/**
 * Update draft assignment
 */
export async function updateAssignment(
  id: string,
  data: {
    groupId?: string;
    title: string;
    description?: string;
    scoringBasePoints?: number;
    scoringRankStep?: number;
    questions?: QuestionDraft[];
  }
) {
  const supabase = createAdminClient();

  // Verify not started
  const { count: attemptsCount } = await supabase
    .from("assignment_attempts")
    .select("*", { count: "exact", head: true })
    .eq("assignment_id", id);

  if ((attemptsCount || 0) > 0) {
    throw new Error("O‘quvchilar allaqachon topshiriqni boshlagan, savollarni o‘zgartirib bo‘lmaydi.");
  }

  const { error: updateErr } = await supabase
    .from("assignments")
    .update({
      title: data.title.trim(),
      description: data.description?.trim() || null,
      group_id: data.groupId,
      scoring_base_points: data.scoringBasePoints || 1000,
      scoring_rank_step: data.scoringRankStep || 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateErr) throw new Error(updateErr.message);

  if (data.questions) {
    // Delete existing questions (cascade deletes options)
    await supabase.from("assignment_questions").delete().eq("assignment_id", id);

    // Re-insert questions and options
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      const { data: createdQ, error: qErr } = await supabase
        .from("assignment_questions")
        .insert({
          assignment_id: id,
          position: i + 1,
          question_text: q.questionText.trim(),
        })
        .select("id")
        .single();

      if (qErr || !createdQ) throw new Error(qErr?.message);

      const optionInserts = q.options.map((opt, optIndex) => ({
        question_id: createdQ.id,
        position: optIndex + 1,
        option_text: opt.optionText.trim(),
        is_correct: opt.isCorrect,
      }));

      const { error: optErr } = await supabase.from("question_options").insert(optionInserts);
      if (optErr) throw new Error(optErr.message);
    }
  }

  return true;
}

/**
 * Publish Assignment: snapshots active students and optionally posts to Telegram
 */
export async function publishAssignment(id: string, sendToTelegram = true) {
  const supabase = createAdminClient();

  const { data: assignment, error: assErr } = await supabase
    .from("assignments")
    .select("*, groups(name)")
    .eq("id", id)
    .single();

  if (assErr || !assignment) throw new Error("Topshiriq topilmadi");

  // 1. Snapshot active group students
  const { data: activeStudents, error: stErr } = await supabase
    .from("group_students")
    .select("student_id, students(id, first_name, last_name)")
    .eq("group_id", assignment.group_id)
    .eq("status", "Faol");

  if (stErr || !activeStudents || activeStudents.length === 0) {
    throw new Error("Guruhda faol o‘quvchilar mavjud emas. Avval guruhga o‘quvchilarni qo‘shing.");
  }

  // Insert snapshots
  const participantInserts = activeStudents.map((gs: any) => ({
    assignment_id: id,
    student_id: gs.student_id,
    display_name_snapshot: `${gs.students?.first_name} ${gs.students?.last_name || ""}`.trim(),
  }));

  await supabase.from("assignment_participants").upsert(participantInserts, {
    onConflict: "assignment_id, student_id",
  });

  // 2. Count questions
  const { count: questionCount } = await supabase
    .from("assignment_questions")
    .select("*", { count: "exact", head: true })
    .eq("assignment_id", id);

  if ((questionCount || 0) === 0) {
    throw new Error("Topshiriqda kamida 1 ta savol bo‘lishi kerak");
  }

  let telegramMsgId: number | null = null;

  // 3. Send Telegram Notification if enabled
  if (sendToTelegram) {
    const { data: telegramLink } = await supabase
      .from("telegram_group_links")
      .select("*")
      .eq("group_id", assignment.group_id)
      .eq("status", "Faol")
      .maybeSingle();

    if (!telegramLink) {
      throw new Error(
        "Guruhga Telegram guruhi ulanmagan. Avval guruh sahifasida Telegram guruhini ulang yoki 'Telegramga yubormasdan e'lon qilish'ni tanlang."
      );
    }

    const { username, appUrl } = getTelegramConfig();
    const groupName = (assignment as any).groups?.name || "Guruh";

    const messageText =
      `🎯 <b>Yangi topshiriq!</b>\n\n` +
      `📚 <b>${assignment.title}</b>\n` +
      `👥 Guruh: <b>${groupName}</b>\n` +
      `❓ Savollar soni: <b>${questionCount} ta savol</b>\n` +
      `⏱ Vaqt chegarasi: <b>Cheklovsiz</b>\n\n` +
      `🏆 <b>Ball tizimi:</b>\n` +
      `To‘g‘ri javobni boshqalardan oldin tasdiqlagan o‘quvchi ko‘proq ball oladi (1-o‘rin: ${assignment.scoring_base_points} ball, 2-o‘rin: ${assignment.scoring_base_points - assignment.scoring_rank_step} ball...)!\n\n` +
      `<i>O‘zingizni sinab ko‘ring va birinchi bo‘ling! 👇</i>`;

    // Telegram Mini App button (startapp parameter)
    const buttonUrl = username
      ? `https://t.me/${username}/app?startapp=${assignment.public_token}`
      : `${appUrl}/play/${assignment.public_token}`;

    const sentMessage = await sendTelegramMessage(telegramLink.telegram_chat_id, messageText, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚀 Topshiriqni boshlash",
              url: buttonUrl,
            },
          ],
        ],
      },
    });

    if (sentMessage?.message_id) {
      telegramMsgId = sentMessage.message_id;
    }
  }

  // 4. Update assignment status
  await supabase
    .from("assignments")
    .update({
      status: "Faol",
      published_at: new Date().toISOString(),
      telegram_message_id: telegramMsgId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return true;
}

/**
 * Finalize Assignment and Post Leaderboard to Telegram
 */
export async function finalizeAssignment(id: string) {
  const supabase = createAdminClient();

  // Call PostgreSQL atomic finalization function
  const { data: finalizeResult, error: rpcErr } = await supabase.rpc(
    "finalize_assignment_leaderboard" as any,
    { p_assignment_id: id } as any
  );

  if (rpcErr) throw new Error(rpcErr.message);

  const res = finalizeResult as any;
  if (!res?.success) throw new Error(res?.error || "Natijalarni hisoblashda xatolik");

  // Post final results to Telegram group if linked
  const { data: assignment } = await supabase
    .from("assignments")
    .select("*, groups(id, name)")
    .eq("id", id)
    .single();

  if (assignment) {
    const { data: telegramLink } = await supabase
      .from("telegram_group_links")
      .select("*")
      .eq("group_id", assignment.group_id)
      .eq("status", "Faol")
      .maybeSingle();

    if (telegramLink) {
      const medals = ["🥇", "🥈", "🥉"];
      let leaderboardText = `🏆 <b>Natijalar: ${assignment.title}</b>\n\n`;

      if (res.leaderboard && res.leaderboard.length > 0) {
        for (const item of res.leaderboard) {
          const medal = item.rank <= 3 ? medals[item.rank - 1] : `${item.rank}.`;
          leaderboardText += `${medal} <b>${item.display_name}</b> — ${item.final_score.toLocaleString()} ball (${item.correct_count} ta to‘g‘ri)\n`;
        }
      } else {
        leaderboardText += `Hech kim topshirmadi.\n`;
      }

      if (res.missing && res.missing.length > 0) {
        leaderboardText += `\n❌ <b>Topshirmadi:</b>\n`;
        for (const m of res.missing) {
          leaderboardText += `• ${m.display_name}\n`;
        }
      }

      try {
        await sendTelegramMessage(telegramLink.telegram_chat_id, leaderboardText);
      } catch (tgErr) {
        console.error("Error sending final results to Telegram:", tgErr);
      }
    }
  }

  return res;
}

/**
 * Get Admin Participant Progress for Live Assignment Analytics
 */
export async function getAssignmentProgress(id: string): Promise<AdminParticipantProgress[]> {
  const supabase = createAdminClient();

  const [participantsRes, attemptsRes] = await Promise.all([
    supabase.from("assignment_participants").select("*").eq("assignment_id", id),
    supabase.from("assignment_attempts").select("*").eq("assignment_id", id),
  ]);

  const attemptsMap = new Map<string, any>();
  for (const att of attemptsRes.data || []) {
    attemptsMap.set(att.student_id, att);
  }

  const progressList: AdminParticipantProgress[] = (participantsRes.data || []).map((p) => {
    const att = attemptsMap.get(p.student_id);

    if (!att) {
      return {
        studentId: p.student_id,
        displayName: p.display_name_snapshot,
        status: "not_started",
        currentPosition: 1,
        rawScore: 0,
        finalScore: 0,
        finalRank: null,
        correctCount: 0,
        firstPlaceCount: 0,
        secondPlaceCount: 0,
        suspiciousEventCount: 0,
        startedAt: null,
        completedAt: null,
      };
    }

    return {
      studentId: p.student_id,
      displayName: p.display_name_snapshot,
      status: att.status === "completed" ? "completed" : "in_progress",
      currentPosition: att.current_question_position,
      rawScore: att.raw_score,
      finalScore: att.final_score,
      finalRank: att.final_rank,
      correctCount: att.correct_count,
      firstPlaceCount: att.first_place_count,
      secondPlaceCount: att.second_place_count,
      suspiciousEventCount: att.suspicious_event_count,
      startedAt: att.started_at,
      completedAt: att.completed_at,
    };
  });

  return progressList.sort((a, b) => {
    if (a.status === "completed" && b.status !== "completed") return -1;
    if (b.status === "completed" && a.status !== "completed") return 1;
    return b.rawScore - a.rawScore;
  });
}

/**
 * Emergency Admin Reset of a Student Attempt (Teacher reset action)
 */
export async function resetStudentAttempt(assignmentId: string, studentId: string) {
  const supabase = createAdminClient();

  const { data: attempt } = await supabase
    .from("assignment_attempts")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (attempt) {
    // Delete student answers and sessions
    await Promise.all([
      supabase.from("student_answers").delete().eq("attempt_id", attempt.id),
      supabase.from("student_assignment_sessions").delete().eq("attempt_id", attempt.id),
      supabase.from("assignment_event_logs").delete().eq("attempt_id", attempt.id),
      supabase.from("assignment_attempts").delete().eq("id", attempt.id),
    ]);
  }

  return true;
}

/**
 * Duplicate an Assignment as a New Draft
 */
export async function duplicateAssignment(id: string) {
  const supabase = createAdminClient();
  const original = await getAssignmentById(id);
  if (!original) throw new Error("Asl topshiriq topilmadi");

  const newTitle = `${original.title} (Nusxa)`;
  const questionsDraft: QuestionDraft[] = original.questions.map((q) => ({
    position: q.position,
    questionText: q.question_text,
    options: q.options.map((opt) => ({
      position: opt.position,
      optionText: opt.option_text,
      isCorrect: opt.is_correct,
    })),
  }));

  const newId = await createAssignment({
    groupId: original.group_id,
    title: newTitle,
    description: original.description || undefined,
    scoringBasePoints: original.scoring_base_points,
    scoringRankStep: original.scoring_rank_step,
    scoringMinPoints: original.scoring_min_points,
    antiCheatMode: original.anti_cheat_mode,
    questions: questionsDraft,
  });

  return newId;
}
