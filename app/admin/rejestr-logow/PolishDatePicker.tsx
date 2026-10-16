"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { formatPolishDate, getMonthDays, parseIsoDate, parsePolishDate } from "../../lib/calendar-dates";
import styles from "./AuditLog.module.css";

const monthFormat = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric", timeZone: "UTC" });
const dayFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "full", timeZone: "UTC" });
const weekdays = [
  ["pon.", "poniedziałek"],
  ["wt.", "wtorek"],
  ["śr.", "środa"],
  ["czw.", "czwartek"],
  ["pt.", "piątek"],
  ["sob.", "sobota"],
  ["niedz.", "niedziela"],
];

function todayIso() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)?.value).join("-");
}

export default function PolishDatePicker({ name, label, defaultValue = "" }: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(() => formatPolishDate(defaultValue));
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => parseIsoDate(defaultValue) ?? new Date());
  const selected = parsePolishDate(value);
  const days = getMonthDays(month);
  const today = todayIso();
  const monthLabel = monthFormat.format(month);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const calendar = calendarRef.current;
    const focusable = calendar?.querySelector<HTMLButtonElement>("[aria-pressed='true']")
      ?? calendar?.querySelector<HTMLButtonElement>("[aria-current='date']")
      ?? calendar?.querySelector<HTMLButtonElement>("[data-day]");
    focusable?.focus({ preventScroll: true });
    calendar?.scrollIntoView({ block: "nearest" });
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function chooseDate(iso: string) {
    setValue(formatPolishDate(iso));
    inputRef.current?.setCustomValidity("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function changeMonth(offset: number) {
    const next = new Date(month);
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + offset);
    if (next.getUTCFullYear() >= 1 && next.getUTCFullYear() <= 9999) setMonth(next);
  }

  return (
    <div
      ref={rootRef}
      className={styles.dateField}
      lang="pl"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          inputRef.current?.focus();
        }
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className={styles.dateControl}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="dd.mm.rrrr"
          aria-label={`${label} (dd.mm.rrrr)`}
          autoComplete="off"
          maxLength={10}
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            setValue(nextValue);
            event.target.setCustomValidity(nextValue && !parsePolishDate(nextValue) ? "Wpisz poprawną datę w formacie dd.mm.rrrr." : "");
          }}
        />
        <button
          type="button"
          aria-label={`Otwórz kalendarz: ${label}`}
          aria-expanded={open}
          aria-controls={`${id}-calendar`}
          aria-haspopup="dialog"
          onClick={() => {
            if (!open) setMonth(parseIsoDate(selected ?? "") ?? parseIsoDate(today) ?? new Date());
            setOpen(!open);
          }}
        >
          <CalendarDays size={16} aria-hidden="true" />
        </button>
      </div>
      <input type="hidden" name={name} value={selected ?? ""} />
      {open ? (
        <div ref={calendarRef} id={`${id}-calendar`} className={styles.calendar} role="dialog" aria-label={`Wybierz datę: ${label}`}>
          <div className={styles.calendarHeader}>
            <button type="button" onClick={() => changeMonth(-1)} aria-label="Poprzedni miesiąc"><ChevronLeft size={16} aria-hidden="true" /></button>
            <strong aria-live="polite">{monthLabel}</strong>
            <button type="button" onClick={() => changeMonth(1)} aria-label="Następny miesiąc"><ChevronRight size={16} aria-hidden="true" /></button>
          </div>
          <table className={styles.calendarGrid} aria-label={monthLabel}>
            <thead><tr>{weekdays.map(([short, full]) => <th key={full} scope="col" aria-label={full}>{short}</th>)}</tr></thead>
            <tbody>
              {Array.from({ length: days.length / 7 }, (_, week) => (
                <tr key={week}>
                  {days.slice(week * 7, week * 7 + 7).map((day, index) => (
                    <td key={day ?? `empty-${index}`}>
                      {day ? <button type="button" data-day aria-label={dayFormat.format(parseIsoDate(day)!)} aria-pressed={day === selected} aria-current={day === today ? "date" : undefined} onClick={() => chooseDate(day)}>{Number(day.slice(-2))}</button> : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.calendarFooter}>
            <button type="button" onClick={() => chooseDate(today)}>Dzisiaj</button>
            <button type="button" onClick={() => chooseDate("")}>Wyczyść datę</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
