// proxy.ts
import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 只保护 /teacher 开头的路径
  if (!pathname.startsWith("/teacher")) {
    return NextResponse.next();
  }

  // /teacher/login 始终允许访问
  if (pathname.startsWith("/teacher/login")) {
    return NextResponse.next();
  }

  const teacherCookie = req.cookies.get("lexigrow_teacher");

  if (teacherCookie?.value === "1") {
    return NextResponse.next();
  }

  const loginUrl = new URL("/teacher/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/teacher/:path*"],
};
