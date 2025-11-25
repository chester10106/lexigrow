// app/teacher/login/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// 注意：在 Next.js 16 里，searchParams 是 Promise
type Props = {
  searchParams: Promise<{ error?: string }>;
};

// Server Action：处理登录逻辑
async function login(formData: FormData) {
  "use server";

  const password = formData.get("password")?.toString() || "";
  const teacherPassword = process.env.TEACHER_PASSWORD;

  if (!teacherPassword) {
    throw new Error("服务器未正确配置老师密码");
  }

  if (password === teacherPassword) {
    // 正确写 cookie 的方式（对象形式）
    const cookieStore = cookies();
    (await cookieStore).set({
      name: "lexigrow_teacher",
      value: "1",
      httpOnly: true,
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 天
    });

    redirect("/teacher/words");
  }

  // 密码错误
  redirect("/teacher/login?error=1");
}

// 这里必须是 async，才能 await searchParams
export default async function TeacherLoginPage({ searchParams }: Props) {
  const { error } = await searchParams; // ✅ 先 await
  const hasError = error === "1";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold mb-4 text-center">
          LexiGrow 老师登录
        </h1>
        <p className="text-xs text-gray-600 mb-4 text-center">
          请输入老师密码进入后台管理页面。
        </p >

        {hasError && (
          <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
            密码错误，请重试。
          </div>
        )}

        {/* 用 Server Action 处理登录 */}
        <form action={login} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">老师密码</label>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded border px-2 py-1 text-sm"
              placeholder="请输入老师密码"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            登录
          </button>
        </form>
      </div>
    </main>
  );
}