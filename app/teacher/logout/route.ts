// app/teacher/logout/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // 删除 cookie（写成空值 + 过期时间 = 立即清除）
  const res = NextResponse.redirect(new URL("/teacher/login", req.url));
  res.cookies.set("lexigrow_teacher", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return res;
}
