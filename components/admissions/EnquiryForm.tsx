"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { OUTSIDE_INDIA, STATES, validateEnquiry, type EnquiryError, type EnquiryField } from "@/lib/enquiry";

type ProgrammeGroup = { college: string; items: { slug: string; name: string }[] };
type Phone = { display: string; tel: string };
type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; ref: string; delivered: boolean }
  | { kind: "failed"; reason: "failed" | "rateLimited" };

const FIELD_ORDER: EnquiryField[] = ["name", "phone", "email", "state", "programme", "message", "consent"];

/**
 * Accessible enquiry form. Without JS it's a plain POST (browser required/pattern checks, then a thank-you page).
 * With JS: same validation as the server, an error summary that takes focus, per-field messages wired with
 * aria-describedby, and an in-place confirmation that states honestly whether the enquiry was delivered.
 */
export function EnquiryForm({ programmes, phone }: { programmes: ProgrammeGroup[]; phone: Phone }) {
  const t = useTranslations("Enquiry");
  const locale = useLocale();
  const id = useId();
  const [errors, setErrors] = useState<Partial<Record<EnquiryField, EnquiryError>>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [programme, setProgramme] = useState("");
  const summaryRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const slugs = programmes.flatMap((g) => g.items.map((i) => i.slug));

  // Deep link from a programme: /admissions?programme=btech-cse#enquiry
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get("programme");
    if (wanted && programmes.some((g) => g.items.some((i) => i.slug === wanted))) setProgramme(wanted);
    // Questions the Ask SRM assistant couldn't answer arrive pre-filled.
    const message = params.get("message");
    if (message && messageRef.current && !messageRef.current.value) messageRef.current.value = message.slice(0, 1000);
  }, [programmes]);

  useEffect(() => {
    if (status.kind === "sent" || status.kind === "failed") resultRef.current?.focus();
  }, [status]);

  const fieldId = (f: EnquiryField) => `${id}-${f}`;
  const errorId = (f: EnquiryField) => `${id}-${f}-error`;
  const describedBy = (f: EnquiryField, hint?: string) =>
    [hint, errors[f] ? errorId(f) : null].filter(Boolean).join(" ") || undefined;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const local = validateEnquiry(values, slugs);
    if (!local.ok) {
      setErrors(local.errors);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setErrors({});
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, consent: true }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatus({ kind: "sent", ref: data.ref, delivered: data.delivered });
        form.reset();
        setProgramme("");
      } else if (res.status === 422 && data.errors) {
        setStatus({ kind: "idle" });
        setErrors(data.errors);
        requestAnimationFrame(() => summaryRef.current?.focus());
      } else {
        setStatus({ kind: "failed", reason: res.status === 429 ? "rateLimited" : "failed" });
      }
    } catch {
      setStatus({ kind: "failed", reason: "failed" });
    }
  }

  const callLink = (
    <a href={`tel:${phone.tel}`} className="font-semibold whitespace-nowrap">
      {phone.display}
    </a>
  );

  if (status.kind === "sent") {
    return (
      <div ref={resultRef} tabIndex={-1} role="status" className="flex flex-col gap-4 rounded-3xl border border-line p-6 lg:p-8">
        {/* Only promise a callback when the enquiry actually reached admissions. */}
        {status.delivered ? (
          <>
            <h3 className="font-display text-2xl font-bold">{t("successTitle")}</h3>
            <p>{t("successBody", { ref: status.ref })}</p>
          </>
        ) : (
          <>
            <h3 className="font-display text-2xl font-bold">{t("demoTitle")}</h3>
            <p>
              {t("demoNote")} {callLink}
            </p>
          </>
        )}
        <button
          type="button"
          onClick={() => setStatus({ kind: "idle" })}
          className="inline-flex min-h-11 w-fit items-center rounded-full border border-line px-5 font-semibold"
        >
          {t("another")}
        </button>
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;
  const label = "mb-1.5 block font-semibold";
  const control =
    "block min-h-12 w-full rounded-xl border border-line bg-paper px-4 text-ink placeholder:text-ink/60 aria-[invalid=true]:border-2 aria-[invalid=true]:border-[#ffb4a8]";
  const fieldError = (f: EnquiryField) =>
    errors[f] ? (
      <p id={errorId(f)} className="mt-1.5 text-sm font-semibold text-[#ffb4a8]">
        {t(`errors.${errors[f]}`)}
      </p>
    ) : null;

  return (
    <form action="/api/enquiry" method="post" noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {errorCount > 0 ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-2xl border-2 border-[#ffb4a8] p-4"
        >
          <p className="font-semibold">{t("errorSummary", { count: errorCount })}</p>
          <ul className="mt-2 list-disc pl-5">
            {FIELD_ORDER.filter((f) => errors[f]).map((f) => (
              <li key={f}>
                <a href={`#${fieldId(f)}`}>
                  {t(f === "consent" ? "consentLabel" : f)}: {t(`errors.${errors[f]!}`)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {status.kind === "failed" ? (
        <div ref={resultRef} tabIndex={-1} role="alert" className="rounded-2xl border-2 border-[#ffb4a8] p-4">
          {t(status.reason)} {callLink}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor={fieldId("name")} className={label}>
            {t("name")}
          </label>
          <input
            id={fieldId("name")}
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
            aria-invalid={!!errors.name}
            aria-describedby={describedBy("name")}
            className={control}
          />
          {fieldError("name")}
        </div>

        <div>
          <label htmlFor={fieldId("phone")} className={label}>
            {t("phone")}
          </label>
          <input
            id={fieldId("phone")}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            pattern="[+0-9 ()\-]{10,20}"
            aria-invalid={!!errors.phone}
            aria-describedby={describedBy("phone", `${id}-phone-hint`)}
            className={control}
          />
          <p id={`${id}-phone-hint`} className="mt-1.5 text-sm text-fg-muted">
            {t("phoneHint")}
          </p>
          {fieldError("phone")}
        </div>

        <div>
          <label htmlFor={fieldId("email")} className={label}>
            {t("email")} <span className="font-normal text-fg-muted">({t("optional")})</span>
          </label>
          <input
            id={fieldId("email")}
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={describedBy("email")}
            className={control}
          />
          {fieldError("email")}
        </div>

        <div>
          <label htmlFor={fieldId("state")} className={label}>
            {t("state")}
          </label>
          <select
            id={fieldId("state")}
            name="state"
            autoComplete="address-level1"
            required
            defaultValue=""
            aria-invalid={!!errors.state}
            aria-describedby={describedBy("state")}
            className={control}
          >
            <option value="" disabled>
              {t("choose")}
            </option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value={OUTSIDE_INDIA}>{t("outsideIndia")}</option>
          </select>
          {fieldError("state")}
        </div>

        <div className="md:col-span-2">
          <label htmlFor={fieldId("programme")} className={label}>
            {t("programme")} <span className="font-normal text-fg-muted">({t("optional")})</span>
          </label>
          <select
            id={fieldId("programme")}
            name="programme"
            value={programme}
            onChange={(e) => setProgramme(e.target.value)}
            aria-invalid={!!errors.programme}
            aria-describedby={describedBy("programme")}
            className={control}
          >
            <option value="">{t("undecided")}</option>
            {programmes.map((g) => (
              <optgroup key={g.college} label={g.college}>
                {g.items.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {fieldError("programme")}
        </div>

        <div className="md:col-span-2">
          <label htmlFor={fieldId("message")} className={label}>
            {t("message")} <span className="font-normal text-fg-muted">({t("optional")})</span>
          </label>
          <textarea
            ref={messageRef}
            id={fieldId("message")}
            name="message"
            rows={4}
            maxLength={1000}
            aria-invalid={!!errors.message}
            aria-describedby={describedBy("message")}
            className={`${control} py-3`}
          />
          {fieldError("message")}
        </div>
      </div>

      <div>
        <label htmlFor={fieldId("consent")} className="flex min-h-11 cursor-pointer items-start gap-3">
          <input
            id={fieldId("consent")}
            name="consent"
            type="checkbox"
            required
            aria-invalid={!!errors.consent}
            aria-describedby={describedBy("consent")}
            className="mt-1 size-5 shrink-0 accent-[var(--leap-lime)]"
          />
          <span>{t("consent")}</span>
        </label>
        {fieldError("consent")}
      </div>

      <button
        type="submit"
        disabled={status.kind === "sending"}
        data-magnetic
        className="relative inline-flex min-h-12 w-fit items-center overflow-hidden rounded-full bg-action px-8 text-lg font-semibold text-on-action disabled:opacity-70"
      >
        {status.kind === "sending" ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
