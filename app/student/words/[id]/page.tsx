// app/student/words/[id]/page.tsx
import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import { revalidatePath } from "next/cache";
import { getOrCreateCurrentStudent } from "../../../lib/currentStudent";

// Next.js 16 下 params 是 Promise
type Props = {
  params: Promise<{ id: string }>;
};

/**
 * 获取或创建学生的 StudentProfile（等级 & XP）
 */
async function getOrCreateStudentProfile(studentId: string) {
  let profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
  });

  if (!profile) {
    profile = await prisma.studentProfile.create({
      data: {
        userId: studentId,
        level: 1,
        xp: 0,
        totalWordsLearned: 0,
      },
    });
  }

  return profile;
}

/**
 * 经验值计算规则：
 * - 每次获得 xp 加到总 xp 上
 * - 每 100 XP 升一级：level = floor(xp / 100) + 1
 */
async function awardXp(
  studentId: string,
  points: number,
  reason: string | null = null
) {
  if (points <= 0) return;

  const profile = await getOrCreateStudentProfile(studentId);
  const newXp = profile.xp + points;
  const newLevel = Math.floor(newXp / 100) + 1;

  await prisma.studentProfile.update({
    where: { userId: studentId },
    data: {
      xp: newXp,
      level: newLevel,
    },
  });

  await prisma.xPEvent.create({
    data: {
      studentId,
      points,
      reason: reason ?? "word_review",
    },
  });
}

/**
 * 记录一条学习行为到 StudyLog
 * - studentId: 哪个学生
 * - wordId: 哪个单词
 * - action: 行为类型，比如 "mark_known" / "mark_unknown"
 * - isFamiliar: 学生是否认为“会”
 * - isStranger: 是否标记为陌生单词
 */
async function createStudyLog(options: {
  studentId: string;
  wordId: string;
  action: string;
  isFamiliar: boolean;
  isStranger: boolean;
}) {
  const { studentId, wordId, action, isFamiliar, isStranger } = options;

  await prisma.studyLog.create({
    data: {
      userId: studentId,
      wordId,
      action,
      isFamiliar,
      isStranger, // 字段名与 schema 中的 StudyLog 模型一致
    },
  });
}

/**
 * Server Action：标记“我会这个单词” + 增加 XP
 */
async function markKnown(formData: FormData) {
  "use server";

  const wordId = formData.get("wordId")?.toString();
  if (!wordId) return;

  const student = await getOrCreateCurrentStudent();

  const existing = await prisma.studentWordProgress.findUnique({
    where: {
      studentId_wordId: {
        studentId: student.id,
        wordId,
      },
    },
  });

  const now = new Date();
  const nextReview = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  if (!existing) {
    await prisma.studentWordProgress.create({
      data: {
        studentId: student.id,
        wordId,
        status: "MASTERED",
        isStranger: false,
        familiarityScore: 80,
        nextReviewAt: nextReview,
        lastReviewedAt: now,
        correctCount: 1,
      },
    });

    // 第一次掌握这个词时，可以顺便把 totalWordsLearned 加 1
    await prisma.studentProfile.upsert({
      where: { userId: student.id },
      update: {
        totalWordsLearned: { increment: 1 },
      },
      create: {
        userId: student.id,
        level: 1,
        xp: 0,
        totalWordsLearned: 1,
      },
    });
  } else {
    await prisma.studentWordProgress.update({
      where: { id: existing.id },
      data: {
        status: "MASTERED",
        isStranger: false,
        familiarityScore: Math.min(100, existing.familiarityScore + 10),
        nextReviewAt: nextReview,
        lastReviewedAt: now,
        correctCount: existing.correctCount + 1,
      },
    });
  }

  // 奖励 XP：我会这个单词 +10
  await awardXp(student.id, 10, "mark_known_word");

  // 记录到 StudyLog：这次学生认为“会”，也不是陌生单词
  await createStudyLog({
    studentId: student.id,
    wordId,
    action: "mark_known",
    isFamiliar: true,
    isStranger: false,
  });

  revalidatePath("/student/words");
}

/**
 * Server Action：标记“我不会 / 陌生单词” + 少量 XP
 */
async function markUnknown(formData: FormData) {
  "use server";

  const wordId = formData.get("wordId")?.toString();
  if (!wordId) return;

  const student = await getOrCreateCurrentStudent();

  const existing = await prisma.studentWordProgress.findUnique({
    where: {
      studentId_wordId: {
        studentId: student.id,
        wordId,
      },
    },
  });

  const now = new Date();
  const nextReview = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

  if (!existing) {
    await prisma.studentWordProgress.create({
      data: {
        studentId: student.id,
        wordId,
        status: "LEARNING",
        isStranger: true,
        familiarityScore: 20,
        nextReviewAt: nextReview,
        lastReviewedAt: now,
        wrongCount: 1,
        dontKnowCount: 1,
      },
    });
  } else {
    await prisma.studentWordProgress.update({
      where: { id: existing.id },
      data: {
        status: "LEARNING",
        isStranger: true,
        familiarityScore: Math.max(0, existing.familiarityScore - 10),
        nextReviewAt: nextReview,
        lastReviewedAt: now,
        wrongCount: existing.wrongCount + 1,
        dontKnowCount: existing.dontKnowCount + 1,
      },
    });
  }

  // 即使不会，也给一点点 XP
  await awardXp(student.id, 2, "mark_unknown_word");

  // 记录到 StudyLog：这次学生“不熟 / 陌生”
  await createStudyLog({
    studentId: student.id,
    wordId,
    action: "mark_unknown",
    isFamiliar: false,
    isStranger: true,
  });

  revalidatePath("/student/words");
}

export default async function StudentWordDetailPage({ params }: Props) {
  const { id } = await params;

  if (!id) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-red-600 mb-4">无效的单词 ID。</p>
        <Link
          href="/student/words"
          className="text-blue-600 text-sm hover:underline"
        >
          ← 返回单词列表
        </Link>
      </main>
    );
  }

  const word = await prisma.word.findUnique({
    where: { id },
  });

  if (!word) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-red-600 mb-4">未找到这个单词。</p>
        <Link
          href="/student/words"
          className="text-blue-600 text-sm hover:underline"
        >
          ← 返回单词列表
        </Link>
      </main>
    );
  }

  const student = await getOrCreateCurrentStudent();

  const [progress, profile, strangerCount] = await Promise.all([
    prisma.studentWordProgress.findUnique({
      where: {
        studentId_wordId: {
          studentId: student.id,
          wordId: id,
        },
      },
    }),
    getOrCreateStudentProfile(student.id),
    prisma.studentWordProgress.count({
      where: {
        studentId: student.id,
        isStranger: true,
      },
    }),
  ]);

  const syllables =
    word.syllables?.split(/[-\s]/).filter((s) => s.trim().length > 0) ?? [];

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/student/words"
          className="text-blue-600 text-sm hover:underline"
        >
          ← 返回单词列表
        </Link>

        <Link
          href="/student/profile"
          className="text-xs text-purple-700 hover:underline"
        >
          查看我的成长
        </Link>
      </div>

      {/* 1. 单词 + 音标 + 词性 */}
      <section>
        <h1 className="text-3xl font-bold">{word.text}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-gray-700">
          {word.phonetic && (
            <span className="text-lg text-gray-600">{word.phonetic}</span>
          )}
          {word.pos && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
              {word.pos}
            </span>
          )}
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
            disabled
          >
            🔊 发音（稍后接入）
          </button>
        </div>
      </section>

      {/* 2. 当前掌握情况 + 等级信息 */}
      <section className="rounded border p-3 text-sm space-y-1 bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <div className="font-semibold mb-1">
              我的掌握情况（当前学生）
            </div>
            {progress ? (
              <>
                <p>
                  状态：
                  <span className="font-medium">
                    {progress.isStranger
                      ? "陌生单词（需要多复习）"
                      : progress.status === "MASTERED"
                      ? "已掌握"
                      : "学习中"}
                  </span>
                </p>
                <p>熟悉度：{progress.familiarityScore} / 100</p>
                {progress.nextReviewAt && (
                  <p>
                    下次复习时间：
                    {progress.nextReviewAt.toLocaleDateString("zh-CN")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-600">
                还没有学习记录，可以先标记“我会 / 我不会”。
              </p>
            )}
          </div>

          <div className="text-right text-xs text-purple-800">
            <div>
              等级：<span className="font-bold text-base">{profile.level}</span>
            </div>
            <div>总 XP：{profile.xp}</div>
            <div>陌生单词：{strangerCount}</div>
          </div>
        </div>

        <div className="mt-2 flex gap-2">
          {/* 我会 */}
          <form action={markKnown}>
            <input type="hidden" name="wordId" value={word.id} />
            <button
              type="submit"
              className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
            >
              ✅ 我会这个单词
            </button>
          </form>

          {/* 我不会 */}
          <form action={markUnknown}>
            <input type="hidden" name="wordId" value={word.id} />
            <button
              type="submit"
              className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
            >
              ❌ 我不会 / 陌生单词
            </button>
          </form>
        </div>
      </section>

      {/* 3. 音节拆分 */}
      {syllables.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-1">音节拆分</h2>
          <div className="flex flex-wrap gap-2">
            {syllables.map((syl, idx) => (
              <span
                key={`${syl}-${idx}`}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700"
              >
                {syl}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 4. 释义 */}
      <section>
        <h2 className="text-sm font-semibold mb-1">释义</h2>
        <div className="space-y-1 text-sm">
          {word.meaningEn && (
            <p>
              <span className="font-medium">英文：</span>
              {word.meaningEn}
            </p>
          )}
          {word.meaningZh && (
            <p>
              <span className="font-medium">中文：</span>
              {word.meaningZh}
            </p>
          )}
          {!word.meaningEn && !word.meaningZh && (
            <p className="text-gray-500 text-sm">暂时没有填写释义。</p>
          )}
        </div>
      </section>

      {/* 5. 记忆辅助 */}
      {(word.wordRoots || word.mnemonics) && (
        <section>
          <h2 className="text-sm font-semibold mb-1">记忆辅助</h2>
          <div className="space-y-1 text-sm">
            {word.wordRoots && (
              <p>
                <span className="font-medium">词根词缀：</span>
                {word.wordRoots}
              </p>
            )}
            {word.mnemonics && (
              <p>
                <span className="font-medium">联想 / 谐音：</span>
                {word.mnemonics}
              </p>
            )}
          </div>
        </section>
      )}

      {/* 6. 例句 */}
      <section>
        <h2 className="text-sm font-semibold mb-1">应用例句</h2>
        {word.exampleEn ? (
          <div className="space-y-1 text-sm">
            <p className="text-gray-800">{word.exampleEn}</p>
            {word.exampleZh && (
              <p className="text-gray-600">（{word.exampleZh}）</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">暂时没有填写例句。</p>
        )}
      </section>
    </main>
  );
}
