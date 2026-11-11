import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth, signIn, signOut } from "@/auth";
import { db } from "@/db";
import { boardMembers, boards } from "@/db/schema";
import { createBoard } from "./board/actions";

export default async function Home() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-xl font-bold text-white">
            K
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Kanban</h1>
          <p className="mt-1 text-sm text-muted">Plan work together, in real time.</p>
          <form
            className="mt-6"
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <button className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
              Continue with Google
            </button>
          </form>
        </div>
      </main>
    );
  }

  const myBoards = await db
    .select({ id: boards.id, name: boards.name, createdAt: boards.createdAt })
    .from(boardMembers)
    .innerJoin(boards, eq(boardMembers.boardId, boards.id))
    .where(eq(boardMembers.userId, session.user.id))
    .orderBy(desc(boards.createdAt));

  const initial = (session.user.name ?? session.user.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
              K
            </div>
            <span className="font-semibold tracking-tight">Kanban</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-sm font-medium text-accent">
              {initial}
            </div>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button className="text-sm text-muted transition hover:text-foreground">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your boards</h1>
            <p className="mt-1 text-sm text-muted">
              {myBoards.length === 0 ? "Create your first board to get started." : `${myBoards.length} board${myBoards.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <form action={createBoard} className="flex gap-2">
            <input
              name="name"
              placeholder="New board name"
              required
              minLength={2}
              maxLength={60}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20 sm:w-56"
            />
            <button className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
              Create
            </button>
          </form>
        </div>

        {myBoards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted">
            No boards yet. Name one above and press Create.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myBoards.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/board/${b.id}`}
                  className="group flex h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
                >
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 font-semibold text-accent">
                    {b.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium group-hover:text-accent">{b.name}</span>
                  <span className="mt-1 text-xs text-muted">
                    Created {b.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
