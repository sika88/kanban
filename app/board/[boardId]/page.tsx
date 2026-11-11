import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { boards, cards, columns } from "@/db/schema";
import { getMembership } from "@/lib/board";
import { joinBoard } from "../actions";
import Board from "./board";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  if (!z.string().uuid().safeParse(boardId).success) notFound();

  const { isMember } = await getMembership(boardId);
  const [board] = await db.select().from(boards).where(eq(boards.id, boardId));
  if (!board) notFound();

  if (!isMember) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-bold">Join &quot;{board.name}&quot;?</h1>
        <form action={joinBoard.bind(null, boardId)} className="mt-4">
          <button className="rounded bg-black px-4 py-2 text-white">Join board</button>
        </form>
      </main>
    );
  }

  const cols = await db.select().from(columns).where(eq(columns.boardId, boardId)).orderBy(asc(columns.position));
  const rows = await db.select().from(cards).where(eq(cards.boardId, boardId)).orderBy(asc(cards.position));

  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-bold">{board.name}</h1>
      <p className="mb-4 text-sm text-gray-500">Share this page&apos;s URL to invite collaborators.</p>
      <Board
        boardId={boardId}
        columns={cols.map((c) => ({ id: c.id, title: c.title }))}
        cards={rows.map((c) => ({ id: c.id, columnId: c.columnId, title: c.title, position: c.position }))}
      />
    </main>
  );
}
