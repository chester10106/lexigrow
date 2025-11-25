// app/teacher/words/page.tsx
import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

// 这个函数是服务器端的表单处理逻辑
async function addWord(formData: FormData) {
  'use server';

  const text = formData.get('text')?.toString().trim();
  if (!text) {
    // 没有单词就不保存
    return;
  }

  const phonetic = formData.get('phonetic')?.toString().trim() || null;
  const pos = formData.get('pos')?.toString().trim() || null;
  const meaningEn = formData.get('meaningEn')?.toString().trim() || null;
  const meaningZh = formData.get('meaningZh')?.toString().trim() || null;
  const exampleEn = formData.get('exampleEn')?.toString().trim() || null;
  const exampleZh = formData.get('exampleZh')?.toString().trim() || null;
  const syllables = formData.get('syllables')?.toString().trim() || null;
  const wordRoots = formData.get('wordRoots')?.toString().trim() || null;
  const mnemonics = formData.get('mnemonics')?.toString().trim() || null;

  await prisma.word.create({
    data: {
      text,
      phonetic,
      pos,
      meaningEn,
      meaningZh,
      exampleEn,
      exampleZh,
      syllables,
      wordRoots,
      mnemonics,
      // 其他字段先留空，将来再填
    },
  });

  // 让当前页面重新获取数据，显示新词
  revalidatePath('/teacher/words');
}

// 页面本身（服务器组件）
export default async function TeacherWordsPage() {
  const words = await prisma.word.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50, // 先只展示最近 50 个，避免太长
  });
  return (
<main className="mx-auto max-w-4xl p-6">
  <div className="mb-4 flex justify-between">
    <h1 className="text-2xl font-bold">老师端：单词管理</h1>

    <div className="flex gap-4">
      <a
        href="/teacher/stats"
        className="text-sm text-blue-600 hover:underline"
      >
        学生学习数据
      </a>

      <a
        href="/teacher/logout"
        className="text-sm text-red-600 hover:underline"
      >
        退出登录
      </a>
    </div>
  </div>

      {/* 添加单词的表单 */}
      <section className="mb-8 rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-3">添加新单词</h2>
        <form action={addWord} className="space-y-3">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                单词（必填）
              </label>
              <input
                name="text"
                className="w-full rounded border px-2 py-1"
                placeholder="resilient"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">音标</label>
              <input
                name="phonetic"
                className="w-full rounded border px-2 py-1"
                placeholder="/rɪˈzɪliənt/"
              />
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium mb-1">词性</label>
              <input
                name="pos"
                className="w-full rounded border px-2 py-1"
                placeholder="adj."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                英文释义（简短）
              </label>
              <input
                name="meaningEn"
                className="w-full rounded border px-2 py-1"
                placeholder="able to recover quickly"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                中文释义（简短）
              </label>
              <input
                name="meaningZh"
                className="w-full rounded border px-2 py-1"
                placeholder="有弹性的；能迅速恢复的"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                例句（英文）
              </label>
              <textarea
                name="exampleEn"
                className="w-full rounded border px-2 py-1"
                rows={2}
                placeholder="She is very resilient after facing difficulties."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                例句（中文）
              </label>
              <textarea
                name="exampleZh"
                className="w-full rounded border px-2 py-1"
                rows={2}
                placeholder="经历困难后，她很快就恢复了。"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">音节拆分</label>
              <input
                name="syllables"
                className="w-full rounded border px-2 py-1"
                placeholder="re-si-li-ent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">词根词缀</label>
              <input
                name="wordRoots"
                className="w-full rounded border px-2 py-1"
                placeholder="re (again) + sil (leap)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                联想 / 谐音记忆
              </label>
              <input
                name="mnemonics"
                className="w-full rounded border px-2 py-1"
                placeholder="“瑞思联”——遇到事还能连着往上升"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            保存单词
          </button>
        </form>
      </section>

      {/* 已有单词列表 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">最近添加的单词</h2>
        {words.length === 0 ? (
          <p className="text-sm text-gray-500">还没有单词，可以先在上面添加一个。</p>
        ) : (
          <ul className="space-y-2">
            {words.map((w) => (
              <li
                key={w.id}
                className="flex items-start justify-between rounded border px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-semibold">
                    {w.text}{' '}
                    {w.pos && <span className="text-gray-500 text-xs">{w.pos}</span>}
                    {w.phonetic && (
                      <span className="ml-2 text-gray-500 text-xs">{w.phonetic}</span>
                    )}
                  </div>
                  <div className="text-gray-700">
                    {w.meaningZh || w.meaningEn || '（暂无释义）'}
                  </div>
                  {w.exampleEn && (
                    <div className="mt-1 text-gray-600">
                      <span className="font-medium">例句：</span>
                      {w.exampleEn}
                      {w.exampleZh && <span className="ml-2 text-gray-500">（{w.exampleZh}）</span>}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
