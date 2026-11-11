import Link from "next/link";
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
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold tracking-tight">Join &quot;{board.name}&quot;?</h1>
          <p className="mt-1 text-sm text-muted">You&apos;ve been invited to collaborate on this board.</p>
          <form action={joinBoard.bind(null, boardId)} className="mt-6">
            <button className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
              Join board
            </button>
          </form>
        </div>
      </main>
    );
  }

  const cols = await db.select().from(columns).where(eq(columns.boardId, boardId)).orderBy(asc(columns.position));
  const rows = await db.select().from(cards).where(eq(cards.boardId, boardId)).orderBy(asc(cards.position));

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-6 py-3">
          <Link href="/" className="text-sm text-muted transition hover:text-foreground">
            ← All boards
          </Link>
          <span className="text-border">/</span>
          <h1 className="font-semibold tracking-tight">{board.name}</h1>
          <span className="ml-auto hidden text-xs text-muted sm:block">Share this page&apos;s URL to invite people</span>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <Board
          boardId={boardId}
          columns={cols.map((c) => ({ id: c.id, title: c.title }))}
          cards={rows.map((c) => ({ id: c.id, columnId: c.columnId, title: c.title, position: c.position }))}
        />
      </main>
    </div>
  );
}
