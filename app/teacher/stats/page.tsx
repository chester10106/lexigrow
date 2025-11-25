// app/teacher/stats/page.tsx
import Link from "next/link";
import { prisma } from "../../lib/prisma";

type StudentRow = {
  id: string;
  name: string;
  createdAt: Date;
  totalLogs: number;
  knownLogs: number;
  unknownLogs: number;
  masteredWords: number;
  strangerWords: number;
  lastActivity: Date | null;
  level: number | null;
  xp: number | null;
};

export default async function TeacherStatsPage() {
  // 1. 找到所有学生用户（role = "STUDENT"）
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { createdAt: "asc" },
  });

  const rows: StudentRow[] = [];

  // 2. 为每个学生统计数据
  for (const student of students) {
    const [
      totalLogs,
      knownLogs,
      unknownLogs,
      masteredWords,
      strangerWords,
      lastLog,
      profile,
    ] = await Promise.all([
      prisma.studyLog.count({
        where: { userId: student.id },
      }),
      prisma.studyLog.count({
        where: { userId: student.id, action: "mark_known" },
      }),
      prisma.studyLog.count({
        where: { userId: student.id, action: "mark_unknown" },
      }),
      prisma.studentWordProgress.count({
        where: { studentId: student.id, status: "MASTERED" },
      }),
      prisma.studentWordProgress.count({
        where: { studentId: student.id, isStranger: true },
      }),
      prisma.studyLog.findFirst({
        where: { userId: student.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.studentProfile.findUnique({
        where: { userId: student.id },
      }),
    ]);

    rows.push({
      id: student.id,
      name: student.name ?? "未命名学生",
      createdAt: student.createdAt,
      totalLogs,
      knownLogs,
      unknownLogs,
      masteredWords,
      strangerWords,
      lastActivity: lastLog?.createdAt ?? null,
      level: profile?.level ?? null,
      xp: profile?.xp ?? null,
    });
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">学生学习数据总览</h1>
        <div className="flex gap-3 text-sm">
          <Link
            href="/teacher/words"
            className="text-blue-600 hover:underline"
          >
            ← 返回单词管理
          </Link>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-600">目前还没有学生数据。</p>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">学生</th>
                <th className="px-3 py-2 text-left">等级 / XP</th>
                <th className="px-3 py-2 text-right">总学习次数</th>
                <th className="px-3 py-2 text-right">标记“会”次数</th>
                <th className="px-3 py-2 text-right">标记“不会”次数</th>
                <th className="px-3 py-2 text-right">已掌握单词</th>
                <th className="px-3 py-2 text-right">当前陌生单词</th>
                <th className="px-3 py-2 text-left">最近活动</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-gray-500">
                      创建于 {row.createdAt.toLocaleDateString("zh-CN")}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    等级 {row.level ?? "-"} / XP {row.xp ?? 0}
                  </td>
                  <td className="px-3 py-2 text-right">{row.totalLogs}</td>
                  <td className="px-3 py-2 text-right">{row.knownLogs}</td>
                  <td className="px-3 py-2 text-right">{row.unknownLogs}</td>
                  <td className="px-3 py-2 text-right">
                    {row.masteredWords}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.strangerWords}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.lastActivity
                      ? row.lastActivity.toLocaleString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "暂无"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
