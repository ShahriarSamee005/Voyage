"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getRover } from "@/content";
import type { Rover, RoverId } from "@/content/types";
import { actions } from "@/game/state/runStore";
import type { ArchiveSection } from "@/game/state/types";
import { sendChat, useThread } from "@/chat/chatStore";
import { useRun } from "../useRun";

const TABS: { id: ArchiveSection; label: string }[] = [
  { id: "story", label: "STORY / FULL JOURNEY" },
  { id: "gallery", label: "PHOTO GALLERY" },
  { id: "chat", label: "AI CHAT" },
];

/** Historical archive for ONE discovered rover. Zero player diagnostics here (rules §4). */
export function ArchiveView({ roverId }: { roverId: RoverId }) {
  const rover = getRover(roverId);
  const section = useRun((s) => s.archiveSection);

  return (
    <section className="flex h-full flex-col" aria-label={`${rover.name} archive`}>
      <div className="flex items-end justify-between gap-6 px-6 pt-5">
        <div>
          <h3 className="font-mono text-[26px] tracking-[0.2em]">{rover.name.toUpperCase()}</h3>
          <p className="text-[15px] text-ui-muted">
            {rover.mission} · on Mars {rover.epitaph.dates}
          </p>
        </div>
        <div role="tablist" aria-label="Archive sections" className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={section === t.id}
              onClick={() => actions.setArchiveSection(t.id)}
              className={`rounded border px-4 py-2 font-mono text-[13px] tracking-widest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-cyan ${
                section === t.id ? "border-ui-cyan bg-ui-cyan/15 text-ui-cyan" : "border-ui-border/70 text-ui-muted hover:text-ui-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 p-6 pt-4">
        {section === "story" && <StoryTab rover={rover} />}
        {section === "gallery" && <GalleryTab rover={rover} />}
        {section === "chat" && <ChatTab rover={rover} />}
      </div>
    </section>
  );
}

function StoryTab({ rover }: { rover: Rover }) {
  return (
    <ol className="h-full space-y-3 overflow-y-auto pr-2" aria-label="Mission timeline">
      {rover.timeline.map((m, i) => (
        <li key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="mt-2 h-3 w-3 rounded-full bg-ui-cyan" />
            {i < rover.timeline.length - 1 && <span className="w-px flex-1 bg-ui-cyan/40" />}
          </div>
          <div className="flex-1 rounded-md border border-ui-border/70 bg-ui-panel px-5 py-3">
            <div className="flex items-baseline gap-4">
              <span className="w-[150px] shrink-0 font-mono text-[14px] text-ui-cyan">{m.date}</span>
              <span className="font-mono text-[15px] tracking-wider">{m.heading.toUpperCase()}</span>
            </div>
            <p className="mt-1 text-[16px] leading-relaxed text-ui-text/90">{m.summary}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function GalleryTab({ rover }: { rover: Rover }) {
  const [index, setIndex] = useState(0);
  const [missing, setMissing] = useState<Record<string, boolean>>({});
  const img = rover.gallery[index];
  const go = (d: number) => setIndex((i) => (i + d + rover.gallery.length) % rover.gallery.length);

  return (
    <div className="flex h-full gap-5">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md border border-ui-border/70 bg-black">
          {missing[img.src] ? (
            <div className="px-10 text-center text-ui-muted">
              <div className="mb-2 font-mono text-[14px] tracking-widest text-ui-warning">NASA IMAGE NOT DOWNLOADED YET</div>
              <div className="text-[14px]">{img.src}</div>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img.src}
              alt={img.title}
              className="max-h-full max-w-full object-contain"
              onError={() => setMissing((m) => ({ ...m, [img.src]: true }))}
            />
          )}
          <span className="absolute left-3 top-3 rounded bg-black/70 px-2 py-1 font-mono text-[11px] tracking-widest text-ui-amber">
            NASA MISSION IMAGE
          </span>
          <button type="button" aria-label="Previous photo" onClick={() => go(-1)} className={arrowBtn + " left-3"}>
            ◀
          </button>
          <button type="button" aria-label="Next photo" onClick={() => go(1)} className={arrowBtn + " right-3"}>
            ▶
          </button>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[17px]">{img.title}</span>
            <span className="shrink-0 font-mono text-[13px] text-ui-muted">{img.date}</span>
          </div>
          <p className="text-[15px] leading-relaxed text-ui-text/85">{img.caption}</p>
          <p className="mt-1 font-mono text-[12px] text-ui-muted">Credit: {img.credit}</p>
        </div>
      </div>
      <div className="flex w-[150px] shrink-0 flex-col gap-2" aria-label="Photo thumbnails">
        {rover.gallery.map((g, i) => (
          <button
            key={g.src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={g.title}
            aria-current={i === index ? "true" : undefined}
            className={`rounded border p-2 text-left text-[12px] leading-snug focus-visible:outline-2 focus-visible:outline-ui-cyan ${
              i === index ? "border-ui-cyan bg-ui-cyan/10 text-ui-cyan" : "border-ui-border/70 text-ui-muted hover:text-ui-text"
            }`}
          >
            {g.title}
          </button>
        ))}
      </div>
    </div>
  );
}

const arrowBtn =
  "absolute top-1/2 -translate-y-1/2 rounded border border-ui-cyan/60 bg-ui-background/80 px-3 py-2 text-ui-cyan hover:bg-ui-cyan/15 focus-visible:outline-2 focus-visible:outline-ui-cyan";

function ChatTab({ rover }: { rover: Rover }) {
  const thread = useThread(rover.id);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [thread.messages.length]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || thread.pending) return;
    void sendChat(rover.id, draft);
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col">
      <p className="mb-3 text-[15px] text-ui-muted">
        Talk to {rover.name}. It answers only from its verified mission records.
      </p>
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-md border border-ui-border/70 bg-ui-panel p-4" aria-live="polite">
        {thread.messages.length === 0 && (
          <p className="text-[15px] text-ui-muted">Try: &ldquo;What was your mission?&rdquo; or &ldquo;What happened to you?&rdquo;</p>
        )}
        {thread.messages.map((m) => (
          <div key={m.id} className={m.from === "player" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[75%] rounded-md px-4 py-2 text-[16px] leading-relaxed ${
                m.from === "player" ? "bg-ui-cyan/15 text-ui-text" : "border border-ui-border/70 bg-ui-background"
              }`}
            >
              {m.from === "rover" && (
                <div className="mb-0.5 font-mono text-[11px] tracking-widest text-ui-amber">
                  {rover.name.toUpperCase()}
                  {m.source === "fallback" && <span className="text-ui-muted"> · OFFLINE LOG</span>}
                </div>
              )}
              {m.text}
            </div>
          </div>
        ))}
        {thread.pending && <p className="font-mono text-[13px] text-ui-muted">{rover.name} is answering…</p>}
      </div>
      <form onSubmit={submit} className="mt-3 flex gap-3">
        <label htmlFor="chat-input" className="sr-only">
          Ask {rover.name} a question
        </label>
        <input
          id="chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          autoComplete="off"
          placeholder={`Ask ${rover.name} something…`}
          className="flex-1 rounded border border-ui-border bg-ui-background px-4 py-2.5 text-[16px] text-ui-text placeholder:text-ui-muted/70 focus:border-ui-cyan focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || thread.pending}
          className="rounded border border-ui-cyan px-5 font-mono text-[14px] tracking-widest text-ui-cyan hover:bg-ui-cyan/10 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ui-cyan"
        >
          SEND
        </button>
      </form>
    </div>
  );
}
