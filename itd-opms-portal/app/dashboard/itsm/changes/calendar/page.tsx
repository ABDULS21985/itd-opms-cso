"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Loader2,
  Snowflake,
  Wrench,
} from "lucide-react";
import { useChangeCalendar } from "@/hooks/use-itsm";
import type { ChangeCalendarEvent } from "@/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const EVENT_COLORS: Record<string, { bg: string; text: string; icon: typeof GitBranch }> = {
  change: { bg: "rgba(124, 58, 237, 0.15)", text: "#A78BFA", icon: GitBranch },
  freeze: { bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", icon: Snowflake },
  maintenance: { bg: "rgba(234, 179, 8, 0.15)", text: "#FBBF24", icon: Wrench },
};

const CLASSIFICATION_ACCENTS: Record<string, string> = {
  emergency: "#EF4444",
  standard: "#3B82F6",
  normal: "#8B5CF6",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChangeCalendarPage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const rangeStart = startOfMonth(currentMonth);
  const rangeEnd = endOfMonth(currentMonth);

  const { data: events, isLoading } = useChangeCalendar(
    rangeStart.toISOString(),
    rangeEnd.toISOString()
  );

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const today = () => setCurrentMonth(new Date());

  // Build calendar grid.
  const calendarDays = useMemo(() => {
    const firstDay = startOfMonth(currentMonth);
    const lastDay = endOfMonth(currentMonth);
    const startDow = firstDay.getDay(); // 0 = Sunday

    const days: Date[] = [];
    // Pad start
    for (let i = startDow - 1; i >= 0; i--) {
      days.push(new Date(firstDay.getFullYear(), firstDay.getMonth(), -i));
    }
    // Month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(firstDay.getFullYear(), firstDay.getMonth(), d));
    }
    // Pad end to fill grid
    while (days.length % 7 !== 0) {
      const lastDate = days[days.length - 1];
      days.push(new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + 1));
    }
    return days;
  }, [currentMonth]);

  // Group events by date.
  const eventsByDate = useMemo(() => {
    if (!events) return {};
    const map: Record<string, ChangeCalendarEvent[]> = {};
    for (const evt of events) {
      const start = new Date(evt.startTime);
      const end = new Date(evt.endTime);
      // Add event to each day it spans
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map[key]) map[key] = [];
        map[key].push(evt);
      }
    }
    return map;
  }, [events]);

  const todayDate = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/dashboard/itsm/changes")}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft size={16} />
            Back to Changes
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Calendar size={24} className="text-violet-400" />
            Change Calendar
          </h1>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/60">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-lg font-semibold text-white min-w-[200px] text-center">
            {formatMonthYear(currentMonth)}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/60">
            <ChevronRight size={16} />
          </button>
        </div>
        <button onClick={today} className="px-3 py-1.5 rounded-lg border border-white/10 text-sm text-white/60 hover:bg-white/5">
          Today
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-white/50">
        {Object.entries(EVENT_COLORS).map(([type, meta]) => {
          const Icon = meta.icon;
          return (
            <div key={type} className="flex items-center gap-1.5">
              <Icon size={12} style={{ color: meta.text }} />
              <span className="capitalize">{type}</span>
            </div>
          );
        })}
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-white/50">
          <Loader2 className="animate-spin mr-2" size={20} />
          Loading calendar...
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 text-xs text-white/40 uppercase tracking-wider">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="p-3 text-center border-b border-white/[0.06]">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isToday = isSameDay(day, todayDate);
              const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
              const dayEvents = eventsByDate[key] ?? [];

              return (
                <div
                  key={i}
                  className={`min-h-[100px] p-2 border-b border-r border-white/[0.04] ${
                    isCurrentMonth ? "" : "opacity-30"
                  }`}
                >
                  <div className={`text-xs mb-1 ${isToday ? "text-violet-400 font-bold" : "text-white/40"}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((evt, j) => {
                      const meta = EVENT_COLORS[evt.eventType] ?? EVENT_COLORS.change;
                      const clsAccent = evt.classification ? CLASSIFICATION_ACCENTS[evt.classification] : undefined;
                      return (
                        <div
                          key={`${evt.id}-${j}`}
                          className="text-[10px] px-1.5 py-0.5 rounded truncate cursor-default"
                          style={{
                            backgroundColor: meta.bg,
                            color: clsAccent ?? meta.text,
                            borderLeft: `2px solid ${clsAccent ?? meta.text}`,
                          }}
                          title={evt.title}
                        >
                          {evt.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-white/30 pl-1">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
