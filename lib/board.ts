import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { boardMembers } from "@/db/schema";

export async function getMembership(boardId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const [m] = await db
    .select()
    .from(boardMembers)
    .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, session.user.id)))
    .limit(1);
  return { userId: session.user.id, isMember: !!m };
}

export async function requireMember(boardId: string) {
  const { userId, isMember } = await getMembership(boardId);
  if (!isMember) throw new Error("Forbidden");
  return userId;
}
