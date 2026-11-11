"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { boardMembers, boards, cards, columns } from "@/db/schema";
import { getMembership, requireMember } from "@/lib/board";
import { pusher } from "@/lib/pusher";

const id = z.string().uuid();

async function notify(boardId: string) {
  revalidatePath(`/board/${boardId}`);
  try {
    await pusher.trigger(`board-${boardId}`, "changed", {});
  } catch (e) {
    console.error("Pusher failed", e);
  }
}

async function assertColumnInBoard(columnId: string, boardId: string) {
  const [col] = await db
    .select({ id: columns.id })
    .from(columns)
    .where(and(eq(columns.id, columnId), eq(columns.boardId, boardId)));
  if (!col) throw new Error("Invalid column");
}

export async function createBoard(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const name = z.string().trim().min(2).max(60).parse(formData.get("name"));

  const boardId = crypto.randomUUID();
  await db.batch([
    db.insert(boards).values({ id: boardId, name, ownerId: session.user.id }),
    db.insert(boardMembers).values({ boardId, userId: session.user.id }),
    db.insert(columns).values(
      ["To do", "Doing", "Done"].map((title, i) => ({ boardId, title, position: i })),
    ),
  ]);
  redirect(`/board/${boardId}`);
}

export async function joinBoard(boardId: string) {
  const bid = id.parse(boardId);
  const { userId } = await getMembership(bid);
  await db.insert(boardMembers).values({ boardId: bid, userId }).onConflictDoNothing();
  await notify(bid);
}

export async function addCard(
  boardId: string,
  card: { id: string; columnId: string; title: string; position: number },
) {
  const data = z.object({
    boardId: id,
    id,
    columnId: id,
    title: z.string().trim().min(1).max(200),
    position: z.number().finite(),
  }).parse({ boardId, ...card });

  await requireMember(data.boardId);
  await assertColumnInBoard(data.columnId, data.boardId);
  await db.insert(cards).values(data);
  await notify(data.boardId);
}

export async function moveCard(
  boardId: string,
  cardId: string,
  columnId: string,
  position: number,
) {
  const data = z.object({
    boardId: id,
    cardId: id,
    columnId: id,
    position: z.number().finite(),
  }).parse({ boardId, cardId, columnId, position });

  await requireMember(data.boardId);
  await assertColumnInBoard(data.columnId, data.boardId);
  await db
    .update(cards)
    .set({ columnId: data.columnId, position: data.position })
    .where(and(eq(cards.id, data.cardId), eq(cards.boardId, data.boardId)));
  await notify(data.boardId);
}
