// app/student/strangers/page.tsx
import Link from "next/link";
import { prisma } from "../../lib/prisma";
import { getOrCreateCurrentStudent } from "../../lib/currentStudent";

export default async function StrangerWordsPage() {
  const student = await getOrCreateCurrentStudent();

  // 找出这个学生所有标记为「陌生单词」的记录
  const progresses = await prisma.studentWordProgress.findMany({
    where: {
      studentId: student.id,
      isStranger: true,
    },
    include: {
      word: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">陌生单词复习</h1>
          <p className="text-sm text-gray-600 mt-1">
            这里会集中显示你标记为「不会 / 陌生单词」的词。复习时在单词详情页点「✅
            我会这个单词」，它就会从这里消失。
          </p>
        </div>

        <Link
          href="/student/words"
          className="text-blue-600 text-sm hover:underline"
        >
          ← 返回全部单词
        </Link>
      </header>

      {progresses.length === 0 ? (
        <p className="text-sm text-green-700">
          🎉 目前没有陌生单词了，你已经把所有标记的难词都搞定啦！
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-700">
            当前共有{" "}
            <span className="font-semibold">{progresses.length}</span> 个陌生单词。
            建议从上往下逐个复习。
          </p>

          <ul className="space-y-2">
            {progresses.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded border p-3 text-sm"
              >
                <div>
                  <div className="font-semibold text-base">
                    {p.word.text}
                  </div>
                  <div className="text-gray-700">
                    {p.word.meaningZh || p.word.meaningEn || "（暂无释义）"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    熟悉度：{p.familiarityScore} / 100
                    {p.lastReviewedAt && (
                      <>
                        {" "}
                        · 最近复习：
                        {p.lastReviewedAt.toLocaleDateString("zh-CN")}
                      </>
                    )}
                  </div>
                </div>

                <Link
                  href={`/student/words/${p.wordId}`}
                  className="rounded bg-amber-500 px-3 py-1 text-xs text-white hover:bg-amber-600"
                >
                  去复习这个单词
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
