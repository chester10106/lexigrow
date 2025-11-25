// app/student/words/page.tsx
import Link from "next/link";
import { prisma } from "../../lib/prisma";

export default async function StudentWordListPage() {
  const words = await prisma.word.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">学生端：单词列表</h1>

        {/* 新增：跳转到陌生单词复习 */}
        <Link
          href="/student/strangers"
          className="rounded bg-amber-500 px-3 py-1 text-xs text-white hover:bg-amber-600"
        >
          查看 / 复习陌生单词
        </Link>
      </header>

      {words.length === 0 && <p>还没有任何单词。</p>}

      <ul className="space-y-2">
        {words.map((w) => (
          <li
            key={w.id}
            className="flex items-center justify-between rounded border p-3"
          >
            <div>
              <div className="font-semibold text-lg">{w.text}</div>
              <div className="text-gray-600 text-sm">
                {w.meaningZh || w.meaningEn || "无释义"}
              </div>
            </div>

            <Link
              href={`/student/words/${w.id}`}
              className="rounded bg-blue-600 text-white px-3 py-1 text-sm"
            >
              学习
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
