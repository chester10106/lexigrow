// app/lib/currentStudent.ts
import { prisma } from "./prisma";

/**
 * 当前阶段的简化版：
 * - 找到一个 role = "STUDENT" 的用户
 * - 如果没有，就创建一个默认学生
 * - 所有学生端操作先共用这个学生账号
 *
 * 以后要做真正的多学生登录时，
 * 再在这里改成：根据登录用户来返回对应 student。
 */
export async function getOrCreateCurrentStudent() {
  // 找已有学生
  let student = await prisma.user.findFirst({
    where: { role: "STUDENT" },
  });

  // 没有就创建一个
  if (!student) {
    student = await prisma.user.create({
      data: {
        name: "Default Student",
        role: "STUDENT",
      },
    });
  }

  return student;
}
