"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PusherClient from "pusher-js";
import {
  DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { addCard, moveCard } from "../actions";

type Col = { id: string; title: string };
type CardT = { id: string; columnId: string; title: string; position: number };
type Action =
  | { type: "move"; cardId: string; columnId: string; position: number }
  | { type: "add"; card: CardT };
type DropData =
  | { type: "column"; columnId: string }
  | { type: "card"; columnId: string; cardId: string };

function positionFor(list: CardT[], beforeId?: string) {
  if (!beforeId) return (list.at(-1)?.position ?? 0) + 1024;
  const i = list.findIndex((c) => c.id === beforeId);
  const next = list[i];
  const prev = list[i - 1];
  return prev ? (prev.position + next.position) / 2 : next.position / 2;
}

export default function Board({
  boardId, columns, cards,
}: { boardId: string; columns: Col[]; cards: CardT[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [optCards, applyOptimistic] = useOptimistic(cards, (state, a: Action) =>
    a.type === "move"
      ? state.map((c) => c.id === a.cardId ? { ...c, columnId: a.columnId, position: a.position } : c)
      : [...state, a.card],
  );

  useEffect(() => {
    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    const channel = pusher.subscribe(`board-${boardId}`);
    channel.bind("changed", () => router.refresh());
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`board-${boardId}`);
      pusher.disconnect();
    };
  }, [boardId, router]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const cardId = String(active.id);
    const target = over.data.current as DropData;
    if (target.type === "card" && target.cardId === cardId) return;

    const list = optCards
      .filter((c) => c.columnId === target.columnId && c.id !== cardId)
      .sort((a, b) => a.position - b.position);
    const position = positionFor(list, target.type === "card" ? target.cardId : undefined);

    startTransition(async () => {
      applyOptimistic({ type: "move", cardId, columnId: target.columnId, position });
      await moveCard(boardId, cardId, target.columnId, position);
    });
  }

  function onAdd(columnId: string, title: string) {
    const position =
      Math.max(0, ...optCards.filter((c) => c.columnId === columnId).map((c) => c.position)) + 1024;
    const card = { id: crypto.randomUUID(), columnId, title, position };
    startTransition(async () => {
      applyOptimistic({ type: "add", card });
      await addCard(boardId, card);
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex items-start gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <Column
            key={col.id}
            col={col}
            cards={optCards.filter((c) => c.columnId === col.id).sort((a, b) => a.position - b.position)}
            onAdd={onAdd}
          />
        ))}
      </div>
    </DndContext>
  );
}

function Column({
  col, cards, onAdd,
}: { col: Col; cards: CardT[]; onAdd: (columnId: string, title: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${col.id}`,
    data: { type: "column", columnId: col.id } satisfies DropData,
  });
  const [title, setTitle] = useState("");

  return (
    <section
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border bg-surface p-3 shadow-sm transition ${
        isOver ? "border-accent ring-2 ring-accent/20" : "border-border"
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold tracking-tight">{col.title}</h2>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted">
          {cards.length}
        </span>
      </div>

      <div className="min-h-12 space-y-2">
        {cards.map((c) => <CardItem key={c.id} card={c} />)}
      </div>

      <form
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          onAdd(col.id, title.trim());
          setTitle("");
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="+ Add a card"
          maxLength={200}
          className="w-full rounded-lg border border-transparent bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </form>
    </section>
  );
}

function CardItem({ card }: { card: CardT }) {
  const drag = useDraggable({ id: card.id });
  const drop = useDroppable({
    id: `drop-${card.id}`,
    data: { type: "card", columnId: card.columnId, cardId: card.id } satisfies DropData,
  });

  return (
    <div
      ref={(node) => { drag.setNodeRef(node); drop.setNodeRef(node); }}
      {...drag.listeners}
      {...drag.attributes}
      style={{
        transform: drag.transform
          ? `translate3d(${drag.transform.x}px, ${drag.transform.y}px, 0)`
          : undefined,
      }}
      className={`cursor-grab select-none rounded-lg border bg-background p-3 text-sm shadow-sm transition active:cursor-grabbing ${
        drag.isDragging
          ? "z-10 scale-[1.02] border-accent opacity-90 shadow-lg"
          : "border-border hover:border-accent/60"
      }`}
    >
      {card.title}
    </div>
  );
}
