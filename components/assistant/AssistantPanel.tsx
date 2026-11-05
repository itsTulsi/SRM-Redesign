"use client";

import NextLink from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import type { Block, Reply } from "@/lib/assistant";
import { Buddy } from "./Buddy";

type Message = { id: number; role: "user"; text: string } | { id: number; role: "bot"; reply: Reply | "pending" | "error" | "offline" };

/**
 * The "Ask SRM" chat panel. Loaded only when the visitor opens it. Every answer comes from /api/assistant,
 * which answers from verified content only (no AI). A modal <dialog>: focus is contained, Esc closes it,
 * and the conversation is a polite live region so screen readers hear each answer.
 */
export default function AssistantPanel({
  open,
  onClose,
  call,
}: {
  open: boolean;
  onClose: () => void;
  call: { display: string; tel: string };
}) {
  const t = useTranslations("Assistant");
  const locale = useLocale();
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: 0, role: "bot", reply: { blocks: [{ type: "text", text: t("hello") }], suggestions: t.raw("starters") as string[] } },
  ]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    const userId = nextId.current++;
    const botId = nextId.current++;
    setMessages((m) => [...m, { id: userId, role: "user", text: q }, { id: botId, role: "bot", reply: "pending" }]);
    setText("");
    let reply: Reply | "error" | "offline" = "error";
    try {
      const res = await fetch(`/api/assistant?q=${encodeURIComponent(q)}&locale=${locale}`);
      if (res.ok) reply = (await res.json()) as Reply;
    } catch {
      // Answers come from the server, so offline there's nothing to look up: say so, and offer a person instead.
      reply = navigator.onLine ? "error" : "offline";
    }
    setMessages((m) => m.map((msg) => (msg.id === botId ? { id: botId, role: "bot", reply } : msg)));
  }

  const lastBot = [...messages].reverse().find((m) => m.role === "bot");

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      data-lenis-prevent
      onClose={onClose}
      onClick={(e) => {
        // Following a link inside an answer closes the panel.
        if ((e.target as HTMLElement).closest("a")) onClose();
      }}
      className="assistant-panel m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-bg p-0 text-fg backdrop:bg-ink/50 sm:fixed sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[min(42rem,calc(100dvh-2rem))] sm:w-[26rem] sm:rounded-3xl sm:border sm:border-line sm:shadow-2xl sm:backdrop:bg-transparent"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-start justify-between gap-3 border-b border-line-subtle px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#623562]">
              <Buddy mood={messages.some((m) => m.role === "bot" && m.reply === "pending") ? "think" : "idle"} className="size-11" />
            </span>
            <div>
              <h2 id={`${id}-title`} className="font-display text-xl font-bold">
                {t("title")}
              </h2>
              <p className="text-xs text-fg-muted">{t("subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-line"
          >
            <span className="sr-only">{t("close")}</span>
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div role="log" aria-live="polite" aria-relevant="additions" className="flex-1 overflow-y-auto px-4 py-4">
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <li key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
                {m.role === "user" ? (
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-paper px-4 py-2 text-ink">
                    <span className="sr-only">{t("you")}: </span>
                    {m.text}
                  </p>
                ) : m.reply === "pending" ? (
                  <p className="flex items-center gap-2 text-fg-muted">
                    <Buddy mood="think" className="size-8" />
                    {t("thinking")}
                  </p>
                ) : m.reply === "error" ? (
                  <p>{t("error")}</p>
                ) : m.reply === "offline" ? (
                  <p>
                    {t("offline")}{" "}
                    <a href={`tel:${call.tel}`} className="font-semibold whitespace-nowrap">
                      {call.display}
                    </a>
                  </p>
                ) : (
                  <div className="flex max-w-[95%] flex-col gap-2 rounded-2xl rounded-bl-sm border border-line-subtle px-4 py-3">
                    {m.reply.blocks.map((b, i) => (
                      <BlockView key={i} block={b} sourceLabel={t("source")} aiLabel={t("aiNote")} />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {lastBot && lastBot.role === "bot" && typeof lastBot.reply === "object" && lastBot.reply.suggestions.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {lastBot.reply.suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => ask(s)}
                    className="inline-flex min-h-11 items-center rounded-full border border-line px-3 text-sm hover:border-fg"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(text);
          }}
          className="flex items-center gap-2 border-t border-line-subtle p-3"
        >
          <label htmlFor={`${id}-q`} className="sr-only">
            {t("inputLabel")}
          </label>
          <input
            ref={inputRef}
            id={`${id}-q`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={300}
            autoComplete="off"
            enterKeyHint="send"
            placeholder={t("placeholder")}
            className="min-h-12 min-w-0 flex-1 rounded-full bg-paper px-4 text-ink placeholder:text-ink/65"
          />
          <button type="submit" className="inline-flex min-h-12 shrink-0 items-center rounded-full bg-action px-5 font-semibold text-on-action">
            {t("send")}
          </button>
        </form>
      </div>
    </dialog>
  );
}

function BlockView({ block, sourceLabel, aiLabel }: { block: Block; sourceLabel: string; aiLabel: string }) {
  const linkClass = "inline-flex min-h-11 items-center font-semibold underline underline-offset-4";
  switch (block.type) {
    case "text":
      return block.ai ? (
        <div>
          <p>{block.text}</p>
          <p className="mt-1 text-xs text-fg-muted">{aiLabel}</p>
        </div>
      ) : (
        <p>{block.text}</p>
      );
    case "facts":
      return (
        <div>
          {block.title ? <p className="font-semibold">{block.title}</p> : null}
          <dl className="mt-1 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
            {block.rows.map((r) => (
              <div key={r.label} className="contents">
                <dt className="text-fg-muted">{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
          {block.source ? (
            <a href={block.source} className="mt-1 inline-flex min-h-11 items-center text-xs underline">
              {sourceLabel}
            </a>
          ) : null}
        </div>
      );
    case "links":
      return (
        <ul className="flex flex-col">
          {block.links.map((l) => (
            <li key={l.href + l.label}>
              {l.external ? (
                <a href={l.href} className={linkClass}>
                  {l.label}
                </a>
              ) : (
                <NextLink href={l.href} className={linkClass}>
                  {l.label}
                </NextLink>
              )}
            </li>
          ))}
        </ul>
      );
    case "programmes":
      return (
        <ul className="flex flex-col gap-2">
          {block.items.map((p) => (
            <li key={p.slug}>
              <NextLink href={p.href} className="flex min-h-11 flex-col rounded-xl bg-paper/90 px-3 py-2 text-ink no-underline hover:bg-paper">
                <span className="font-semibold">{p.name}</span>
                <span className="text-xs">{p.meta}</span>
              </NextLink>
            </li>
          ))}
        </ul>
      );
    case "call":
      return (
        <ul className="flex flex-wrap gap-2">
          {block.phones.map((p) => (
            <li key={p.tel}>
              <a href={`tel:${p.tel}`} className="inline-flex min-h-11 flex-col justify-center rounded-xl bg-action px-3 py-1.5 text-on-action no-underline">
                <span className="font-semibold">{p.display}</span>
                <span className="text-xs">{p.label}</span>
              </a>
            </li>
          ))}
        </ul>
      );
  }
}
