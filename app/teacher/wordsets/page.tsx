// app/teacher/wordsets/page.tsx
import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";

async function createWordSet(formData: FormData) {
  "use server";

  const name = formData.get("name")?.toString().trim();
  if (!name) return;

  const description = formData.get("description")?.toString().trim() || null;
  const storyEn = formData.get("storyEn")?.toString().trim() || null;
  const storyZh = formData.get("storyZh")?.toString().trim() || null;

  // 选中的 wordId，HTML 多选 select 会传多个同名字段
  const selectedWordIds = formData.getAll("wordIds").map((v) => v.toString());

  // TODO: 这里先假设 createdByUserId 是某个固定老师
  // 之后接入登录系统后再替换
  const teacherUser = await prisma.user.findFirst({
    where: { role: "TEACHER" },
  });

  let createdByUserId: string;

  if (teacherUser) {
    createdByUserId = teacherUser.id;
  } else {
    // 如果没有老师账号，就先创建一个占位老师
    const newTeacher = await prisma.user.create({
      data: {
        name: "Default Teacher",
        role: "TEACHER",
      },
    });
    createdByUserId = newTeacher.id;
  }

  const wordSet = await prisma.wordSet.create({
    data: {
      name,
      description,
      storyEn,
      storyZh,
      createdByUserId,
    },
  });

  // 为这个 WordSet 关联选中的单词
  if (selectedWordIds.length > 0) {
    await prisma.wordSetWord.createMany({
      data: selectedWordIds.map((wordId, index) => ({
        wordSetId: wordSet.id,
        wordId,
        orderIndex: index,
      })),
    });
  }

  revalidatePath("/teacher/wordsets");
}

export default async function TeacherWordSetsPage() {
  // 所有单词（供选择）
  const words = await prisma.word.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // 已有的单词包
  const wordSets = await prisma.wordSet.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      words: {
        include: { word: true },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">老师端：单词包 & 故事</h1>

      {/* 创建新单词包 */}
      <section className="rounded border p-4 space-y-3">
        <h2 className="text-lg font-semibold">创建新的单词包 + 故事</h2>
        <form action={createWordSet} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              单词包名称（必填）
            </label>
            <input
              name="name"
              required
              className="w-full rounded border px-2 py-1"
              placeholder="例如：Unit 1 - Health Words"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">描述</label>
            <input
              name="description"
              className="w-full rounded border px-2 py-1"
              placeholder="例如：本单元健康主题核心词汇"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                英文小故事
              </label>
              <textarea
                name="storyEn"
                rows={4}
                className="w-full rounded border px-2 py-1 text-sm"
                placeholder="用这些单词写一段简短有趣的小故事（英文）"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                中文小故事（翻译）
              </label>
              <textarea
                name="storyZh"
                rows={4}
                className="w-full rounded border px-2 py-1 text-sm"
                placeholder="对应的中文故事，方便学生理解"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              选择包含的单词（按住 Ctrl 或 Shift 多选）
            </label>
            <select
              name="wordIds"
              multiple
              className="w-full rounded border px-2 py-1 h-40 text-sm"
            >
              {words.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.text} —— {w.meaningZh || w.meaningEn || "（无释义）"}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              提示：按住 Ctrl（或 Command）可以多选；先不选也可以，稍后再补充。
            </p>
          </div>

          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            保存单词包
          </button>
        </form>
      </section>

      {/* 已有单词包列表 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">已有单词包</h2>
        {wordSets.length === 0 ? (
          <p className="text-sm text-gray-500">还没有创建任何单词包。</p>
        ) : (
          <ul className="space-y-3">
            {wordSets.map((set) => (
              <li key={set.id} className="rounded border p-3 text-sm space-y-1">
                <div className="flex justify-between items-center">
                  <div className="font-semibold">{set.name}</div>
                  <div className="text-xs text-gray-500">
                    共 {set.words.length} 个单词
                  </div>
                </div>
                {set.description && (
                  <div className="text-gray-700">{set.description}</div>
                )}
                {set.storyEn && (
                  <div className="mt-2">
                    <div className="font-medium">英文故事：</div>
                    <div className="text-gray-800 whitespace-pre-wrap">
                      {set.storyEn}
                    </div>
                  </div>
                )}
                {set.storyZh && (
                  <div className="mt-1">
                    <div className="font-medium">中文故事：</div>
                    <div className="text-gray-700 whitespace-pre-wrap">
                      {set.storyZh}
                    </div>
                  </div>
                )}
                {set.words.length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium">包含单词：</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {set.words.map((w) => (
                        <span
                          key={w.id}
                          className="rounded bg-gray-100 px-2 py-0.5 text-xs"
                        >
                          {w.word.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
