import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth, signIn, signOut } from "@/auth";
import { db } from "@/db";
import { boardMembers, boards } from "@/db/schema";
import { createBoard } from "./board/actions";

export default async function Home() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="p-8">
        <form action={async () => { "use server"; await signIn("google"); }}>
          <button className="rounded bg-black px-4 py-2 text-white">Sign in with Google</button>
        </form>
      </main>
    );
  }

  const myBoards = await db
    .select({ id: boards.id, name: boards.name })
    .from(boardMembers)
    .innerJoin(boards, eq(boardMembers.boardId, boards.id))
    .where(eq(boardMembers.userId, session.user.id));

  return (
    <main className="mx-auto max-w-xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Your boards</h1>
      <ul className="space-y-2">
        {myBoards.map((b) => (
          <li key={b.id}>
            <Link className="underline" href={`/board/${b.id}`}>{b.name}</Link>
          </li>
        ))}
      </ul>
      <form action={createBoard} className="flex gap-2">
        <input name="name" placeholder="New board" className="flex-1 rounded border p-2 text-black" required />
        <button className="rounded bg-black px-4 text-white">Create</button>
      </form>
      <form action={async () => { "use server"; await signOut(); }}>
        <button className="text-sm underline">Sign out</button>
      </form>
    </main>
  );
}
