"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Video, Phone, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InterviewType, InterviewStatus } from "@/types/interview";
import type { Interview } from "@/types/interview";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const statusDotColors: Record<string, string> = {
  [InterviewStatus.SCHEDULED]: "bg-emerald-500",
  [InterviewStatus.COMPLETED]: "bg-[var(--primary)]",
  [InterviewStatus.CANCELLED]: "bg-[var(--error)]",
  [InterviewStatus.NO_SHOW]: "bg-amber-500",
};

const typeIcons: Record<string, typeof Video> = {
  [InterviewType.VIDEO]: Video,
  [InterviewType.IN_PERSON]: Building2,
  [InterviewType.PHONE]: Phone,
};

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startDow = first.getDay();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function getWeekDates(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

const HOUR_START = 8;
const HOUR_END = 18;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

/* ------------------------------------------------------------------ */
/*  Month View                                                          */
/* ------------------------------------------------------------------ */

function MonthView({
  interviews,
  currentDate,
  selectedDate,
  onSelectDate,
}: {
  interviews: Interview[];
  currentDate: Date;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}) {
  const today = new Date();
  const weeks = useMemo(
    () => getMonthGrid(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate],
  );

  const interviewsByDay = useMemo(() => {
    const map = new Map<string, Interview[]>();
    for (const iv of interviews) {
      const d = new Date(iv.scheduledAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(iv);
    }
    return map;
  }, [interviews]);

  return (
    <div className="bg-[var(--surface-0)] rounded-xl border border-[var(--border)] overflow-hidden">
      {/* Day header row */}
      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="text-center text-xs font-medium text-[var(--neutral-gray)] py-2.5"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day, di) => {
            if (!day) {
              return (
                <div
                  key={`empty-${di}`}
                  className="min-h-[80px] lg:min-h-[100px] border-b border-r border-[var(--border)] bg-[var(--surface-1)]/30"
                />
              );
            }
            const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
            const dayInterviews = interviewsByDay.get(key) || [];
            const isToday = isSameDay(day, today);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const dotCount = Math.min(dayInterviews.length, 3);
            const extraCount = dayInterviews.length - 3;

            return (
              <button
                key={key}
                onClick={() => onSelectDate(day)}
                className={`min-h-[80px] lg:min-h-[100px] border-b border-r border-[var(--border)] p-1.5 text-left transition-colors hover:bg-[var(--surface-1)] ${
                  isSelected ? "bg-[var(--accent-orange)]/5 ring-1 ring-inset ring-[var(--accent-orange)]/30" : ""
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center text-xs font-medium w-6 h-6 rounded-full ${
                    isToday
                      ? "bg-[var(--accent-orange)] text-white"
                      : "text-[var(--text-primary)]"
                  }`}
                >
                  {day.getDate()}
                </span>

                {dayInterviews.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {/* Show up to 2 compact entries on large screens */}
                    {dayInterviews.slice(0, 2).map((iv) => {
                      const time = new Date(iv.scheduledAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      });
                      const dotColor = statusDotColors[iv.status] || "bg-[var(--neutral-gray)]";
                      return (
                        <div
                          key={iv.id}
                          className="hidden lg:flex items-center gap-1 text-[10px] text-[var(--text-primary)] truncate px-1 py-0.5 rounded bg-[var(--surface-1)]"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                          <span className="truncate">{time}</span>
                        </div>
                      );
                    })}
                    {dayInterviews.length > 2 && (
                      <span className="hidden lg:block text-[10px] text-[var(--neutral-gray)] px-1">
                        +{dayInterviews.length - 2} more
                      </span>
                    )}
                    {/* Dots on small screens */}
                    <div className="flex items-center gap-0.5 lg:hidden px-0.5">
                      {dayInterviews.slice(0, dotCount).map((iv, i) => (
                        <span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${statusDotColors[iv.status] || "bg-[var(--neutral-gray)]"}`}
                        />
                      ))}
                      {extraCount > 0 && (
                        <span className="text-[9px] text-[var(--neutral-gray)]">
                          +{extraCount}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Week View                                                           */
/* ------------------------------------------------------------------ */

function WeekView({
  interviews,
  currentDate,
  selectedDate,
  onSelectDate,
}: {
  interviews: Interview[];
  currentDate: Date;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}) {
  const today = new Date();
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  const interviewsByDay = useMemo(() => {
    const map = new Map<string, Interview[]>();
    for (const iv of interviews) {
      const d = new Date(iv.scheduledAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(iv);
    }
    return map;
  }, [interviews]);

  return (
    <div className="bg-[var(--surface-0)] rounded-xl border border-[var(--border)] overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[var(--border)]">
        <div />
        {weekDates.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={day.toISOString()} className="text-center py-2 border-l border-[var(--border)]">
              <div className="text-[10px] font-medium text-[var(--neutral-gray)] uppercase">
                {DAY_NAMES[day.getDay()]}
              </div>
              <div
                className={`inline-flex items-center justify-center text-sm font-semibold w-7 h-7 rounded-full mt-0.5 ${
                  isToday ? "bg-[var(--accent-orange)] text-white" : "text-[var(--text-primary)]"
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hourly grid */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] overflow-y-auto max-h-[600px]">
        {HOURS.map((hour) => (
          <div key={hour} className="contents">
            {/* Time label */}
            <div className="h-16 border-b border-[var(--border)] flex items-start justify-end pr-2 pt-0.5">
              <span className="text-[10px] text-[var(--neutral-gray)]">
                {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </span>
            </div>
            {/* Day columns */}
            {weekDates.map((day) => {
              const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
              const dayInterviews = (interviewsByDay.get(key) || []).filter((iv) => {
                const h = new Date(iv.scheduledAt).getHours();
                return h === hour;
              });

              return (
                <button
                  key={`${key}-${hour}`}
                  onClick={() => onSelectDate(day)}
                  className="h-16 border-b border-l border-[var(--border)] relative hover:bg-[var(--surface-1)]/50 transition-colors"
                >
                  {dayInterviews.map((iv) => {
                    const d = new Date(iv.scheduledAt);
                    const minuteOffset = d.getMinutes();
                    const heightPx = Math.min((iv.duration / 60) * 64, 64);
                    const topPx = (minuteOffset / 60) * 64;
                    const TypeIcon = typeIcons[iv.type] || Video;
                    const dotColor = statusDotColors[iv.status] || "bg-[var(--neutral-gray)]";

                    return (
                      <div
                        key={iv.id}
                        className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium overflow-hidden bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/20 text-[var(--text-primary)]"
                        style={{ top: topPx, height: Math.max(heightPx, 20) }}
                        title={`${iv.candidate?.fullName || "Interview"} - ${iv.duration}min`}
                      >
                        <div className="flex items-center gap-1 truncate">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                          <TypeIcon size={10} className="flex-shrink-0" />
                          <span className="truncate">
                            {iv.candidate?.fullName?.split(" ")[0] || "Interview"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Day Panel — sidebar showing selected day's interviews               */
/* ------------------------------------------------------------------ */

function DayPanel({
  date,
  interviews,
  onClose,
  onSelectInterview,
}: {
  date: Date;
  interviews: Interview[];
  onClose: () => void;
  onSelectInterview?: (iv: Interview) => void;
}) {
  const label = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const sorted = [...interviews].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
      className="w-full lg:w-80 bg-[var(--surface-0)] rounded-xl border border-[var(--border)] p-4 flex-shrink-0"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{label}</h3>
        <button
          onClick={onClose}
          className="text-xs text-[var(--neutral-gray)] hover:text-[var(--text-primary)] transition-colors"
        >
          Close
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-[var(--neutral-gray)] py-4 text-center">
          No interviews on this day
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map((iv) => {
            const time = new Date(iv.scheduledAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });
            const status = statusDotColors[iv.status] || "bg-[var(--neutral-gray)]";
            const TypeIcon = typeIcons[iv.type] || Video;

            return (
              <button
                key={iv.id}
                onClick={() => onSelectInterview?.(iv)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--surface-1)] transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {iv.candidate?.photoUrl ? (
                    <img src={iv.candidate.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-semibold text-[var(--neutral-gray)]">
                      {iv.candidate?.fullName?.charAt(0) || "?"}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                    {iv.candidate?.fullName || "Candidate"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${status}`} />
                    <span className="text-[10px] text-[var(--neutral-gray)]">{time}</span>
                    <TypeIcon size={10} className="text-[var(--neutral-gray)]" />
                    <span className="text-[10px] text-[var(--neutral-gray)]">
                      {iv.duration}min
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  CalendarView — exported composite                                   */
/* ------------------------------------------------------------------ */

type CalendarMode = "month" | "week";

interface CalendarViewProps {
  interviews: Interview[];
}

export function CalendarView({ interviews }: CalendarViewProps) {
  const [mode, setMode] = useState<CalendarMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const title = useMemo(() => {
    if (mode === "month") {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    const week = getWeekDates(currentDate);
    const first = week[0];
    const last = week[6];
    if (first.getMonth() === last.getMonth()) {
      return `${MONTH_NAMES[first.getMonth()]} ${first.getDate()}–${last.getDate()}, ${first.getFullYear()}`;
    }
    return `${MONTH_NAMES[first.getMonth()].slice(0, 3)} ${first.getDate()} – ${MONTH_NAMES[last.getMonth()].slice(0, 3)} ${last.getDate()}, ${last.getFullYear()}`;
  }, [currentDate, mode]);

  function navigate(dir: -1 | 1) {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (mode === "month") {
        next.setMonth(next.getMonth() + dir);
      } else {
        next.setDate(next.getDate() + dir * 7);
      }
      return next;
    });
    setSelectedDate(null);
  }

  function goToToday() {
    setCurrentDate(new Date());
    setSelectedDate(null);
  }

  const selectedDayInterviews = useMemo(() => {
    if (!selectedDate) return [];
    return interviews.filter((iv) => isSameDay(new Date(iv.scheduledAt), selectedDate));
  }, [interviews, selectedDate]);

  return (
    <div className="space-y-4">
      {/* Calendar toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-1)] text-[var(--neutral-gray)] transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] min-w-[180px] text-center">
            {title}
          </h3>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-1)] text-[var(--neutral-gray)] transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={goToToday}
            className="text-xs font-medium px-2.5 py-1 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-1)] text-[var(--text-primary)] transition-colors ml-1"
          >
            Today
          </button>
        </div>

        <div className="flex items-center bg-[var(--surface-1)] rounded-lg p-0.5">
          {(["month", "week"] as CalendarMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setSelectedDate(null); }}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors capitalize ${
                mode === m
                  ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--neutral-gray)] hover:text-[var(--text-primary)]"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar + day panel */}
      <div className="flex gap-4 items-start flex-col lg:flex-row">
        <div className="flex-1 min-w-0 w-full">
          {mode === "month" ? (
            <MonthView
              interviews={interviews}
              currentDate={currentDate}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          ) : (
            <WeekView
              interviews={interviews}
              currentDate={currentDate}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}
        </div>

        <AnimatePresence>
          {selectedDate && (
            <DayPanel
              key={selectedDate.toISOString()}
              date={selectedDate}
              interviews={selectedDayInterviews}
              onClose={() => setSelectedDate(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
