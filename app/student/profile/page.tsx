// app/student/profile/page.tsx
import Link from "next/link";
import { prisma } from "../../lib/prisma";
import { getOrCreateCurrentStudent } from "../../lib/currentStudent";

export default async function StudentProfilePage() {
  const student = await getOrCreateCurrentStudent();

  const [profile, strangerCount, masteredCount, recentXpEvents] =
    await Promise.all([
      prisma.studentProfile.findUnique({
        where: { userId: student.id },
      }),
      prisma.studentWordProgress.count({
        where: { studentId: student.id, isStranger: true },
      }),
      prisma.studentWordProgress.count({
        where: { studentId: student.id, status: "MASTERED" },
      }),
      prisma.xPEvent.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const totalWords = profile?.totalWordsLearned ?? masteredCount;

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">我的成长</h1>
        <Link
          href="/student/words"
          className="text-blue-600 text-sm hover:underline"
        >
          ← 返回单词列表
        </Link>
      </div>

      {/* 等级与基础统计 */}
      <section className="rounded border p-4 bg-purple-50 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-purple-700">当前等级</div>
            <div className="text-3xl font-extrabold text-purple-900">
              {level}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-purple-700">总经验值 XP</div>
            <div className="text-xl font-bold text-purple-900">{xp}</div>
            <div className="text-xs text-purple-700 mt-1">
              每 100 XP 升一级
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-2">
          <div>
            <div className="text-xs text-gray-600">已掌握单词（估算）</div>
            <div className="text-lg font-semibold text-gray-900">
              {totalWords}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600">当前陌生单词数量</div>
            <div className="text-lg font-semibold text-gray-900">
              {strangerCount}
            </div>
          </div>
        </div>
      </section>

      {/* 最近 XP 记录 */}
      <section className="rounded border p-4 text-sm space-y-2">
        <h2 className="font-semibold">最近的经验值变化</h2>
        {recentXpEvents.length === 0 ? (
          <p className="text-gray-500 text-sm">
            暂时还没有记录，多去学习和复习单词就能获得 XP。
          </p>
        ) : (
          <ul className="space-y-1">
            {recentXpEvents.map((e) => (
              <li key={e.id} className="flex justify-between">
                <div>
                  <span className="font-medium">
                    {e.points > 0 ? `+${e.points} XP` : `${e.points} XP`}
                  </span>{" "}
                  <span className="text-gray-600">
                    {e.reason || "单词学习 / 复习"}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {e.createdAt.toLocaleDateString("zh-CN")}{" "}
                  {e.createdAt.toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
