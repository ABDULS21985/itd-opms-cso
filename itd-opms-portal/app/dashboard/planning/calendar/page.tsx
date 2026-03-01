"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  X,
  Clock,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Edit3,
  Snowflake,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  useCalendarEvents,
  useCreateMaintenanceWindow,
  useUpdateMaintenanceWindow,
  useDeleteMaintenanceWindow,
  useCreateFreezePeriod,
  useConflictCheck,
  type CalendarEvent,
  type CreateMaintenanceWindowBody,
  type UpdateMaintenanceWindowBody,
  type CreateFreezePeriodBody,
} from "@/hooks/use-calendar";

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const EVENT_TYPE_COLORS: Record<string, string> = {
  maintenance: "#3B82F6",
  deployment: "#8B5CF6",
  release: "#10B981",
  freeze: "#EF4444",
  outage: "#F97316",
  milestone: "#F59E0B",
  change_request: "#6366F1",
  ticket_change: "#EC4899",
  project_deadline: "#14B8A6",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  maintenance: "Maintenance",
  deployment: "Deployment",
  release: "Release",
  freeze: "Freeze Period",
  outage: "Outage",
  milestone: "Milestone",
  change_request: "Change Request",
  ticket_change: "Ticket Change",
  project_deadline: "Project Deadline",
};

const IMPACT_COLORS: Record<string, string> = {
  none: "#6B7280",
  low: "#10B981",
  medium: "#F59E0B",
  high: "#F97316",
  critical: "#EF4444",
};

const WINDOW_TYPES = [
  { value: "maintenance", label: "Maintenance" },
  { value: "deployment", label: "Deployment" },
  { value: "release", label: "Release" },
  { value: "outage", label: "Outage" },
];

const IMPACT_LEVELS = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const HOUR_START = 7;
const HOUR_END = 22;

/* ================================================================== */
/*  Calendar Computation Helpers                                       */
/* ================================================================== */

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthGrid(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = getDaysInMonth(year, month);
  const daysInPrevMonth = month === 0 ? getDaysInMonth(year - 1, 11) : getDaysInMonth(year, month - 1);

  const cells: Date[] = [];

  // Previous month overflow
  for (let i = startDow - 1; i >= 0; i--) {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    cells.push(new Date(prevYear, prevMonth, daysInPrevMonth - i));
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }

  // Next month overflow
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    cells.push(new Date(nextYear, nextMonth, d));
  }

  // Build rows of 7
  const rows: Date[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  // Only show 5 rows if the 6th row is entirely next month
  if (rows.length === 6) {
    const lastRowFirstDay = rows[5][0];
    if (lastRowFirstDay.getMonth() !== month) {
      rows.pop();
    }
  }

  return rows;
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - day);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const wd = new Date(startOfWeek);
    wd.setDate(startOfWeek.getDate() + i);
    dates.push(wd);
  }
  return dates;
}

function getHourSlots(): string[] {
  const slots: string[] = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) {
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    slots.push(`${hour12}:00 ${suffix}`);
  }
  return slots;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateRange(start: string, end: string, isAllDay: boolean): string {
  const s = new Date(start);
  const e = new Date(end);
  if (isAllDay) {
    if (isSameDay(s, e) || isSameDay(s, new Date(e.getTime() - 1))) {
      return s.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  if (isSameDay(s, e)) {
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${formatTime(start)} - ${formatTime(end)}`;
  }
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${formatTime(start)} - ${e.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${formatTime(end)}`;
}

function getEventTopAndHeight(
  event: CalendarEvent,
): { top: number; height: number } {
  const evStart = new Date(event.startTime);
  const evEnd = new Date(event.endTime);

  const totalMinutes = (HOUR_END - HOUR_START + 1) * 60;
  const dayStartMinutes = HOUR_START * 60;

  const startMinutes = Math.max(
    evStart.getHours() * 60 + evStart.getMinutes() - dayStartMinutes,
    0,
  );
  const endMinutes = Math.min(
    evEnd.getHours() * 60 + evEnd.getMinutes() - dayStartMinutes,
    totalMinutes,
  );

  const top = (startMinutes / totalMinutes) * 100;
  const height = Math.max(((endMinutes - startMinutes) / totalMinutes) * 100, 2);

  return { top, height };
}

function getEventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return events.filter((ev) => {
    const evStart = new Date(ev.startTime);
    const evEnd = new Date(ev.endTime);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    return evStart < dayEnd && evEnd > dayStart;
  });
}

function getMonthName(month: number): string {
  return new Date(2024, month, 1).toLocaleDateString("en-US", { month: "long" });
}

/* ================================================================== */
/*  Main Calendar Page Component                                       */
/* ================================================================== */

type CalendarView = "month" | "week" | "day";

export default function CalendarPage() {
  const [view, setView] = useState<CalendarView>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filterTypes, setFilterTypes] = useState<Set<string>>(
    new Set(Object.keys(EVENT_TYPE_COLORS)),
  );

  const popoverRef = useRef<HTMLDivElement>(null);

  // Compute date range for data fetching based on current view
  const { queryStart, queryEnd } = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth();

    if (view === "month") {
      const start = new Date(y, m, 1);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(y, m + 1, 0);
      end.setDate(end.getDate() + (6 - end.getDay()) + 1);
      return { queryStart: formatDate(start), queryEnd: formatDate(end) };
    }

    if (view === "week") {
      const weekDates = getWeekDates(selectedDate);
      return {
        queryStart: formatDate(weekDates[0]),
        queryEnd: formatDate(new Date(weekDates[6].getTime() + 24 * 60 * 60 * 1000)),
      };
    }

    // day
    return {
      queryStart: formatDate(selectedDate),
      queryEnd: formatDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)),
    };
  }, [selectedDate, view]);

  const activeTypeFilters = useMemo(
    () => (filterTypes.size === Object.keys(EVENT_TYPE_COLORS).length ? undefined : Array.from(filterTypes)),
    [filterTypes],
  );

  const { data: events = [], isLoading } = useCalendarEvents(queryStart, queryEnd, activeTypeFilters);

  // Filter events client-side too in case the backend does not filter by type
  const filteredEvents = useMemo(
    () => events.filter((ev) => filterTypes.has(ev.eventType)),
    [events, filterTypes],
  );

  // Close popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSelectedEvent(null);
        setPopoverPos(null);
      }
    }
    if (selectedEvent) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [selectedEvent]);

  // Navigation
  const goToday = useCallback(() => setSelectedDate(new Date()), []);

  const goPrev = useCallback(() => {
    setSelectedDate((d) => {
      const nd = new Date(d);
      if (view === "month") nd.setMonth(nd.getMonth() - 1);
      else if (view === "week") nd.setDate(nd.getDate() - 7);
      else nd.setDate(nd.getDate() - 1);
      return nd;
    });
  }, [view]);

  const goNext = useCallback(() => {
    setSelectedDate((d) => {
      const nd = new Date(d);
      if (view === "month") nd.setMonth(nd.getMonth() + 1);
      else if (view === "week") nd.setDate(nd.getDate() + 7);
      else nd.setDate(nd.getDate() + 1);
      return nd;
    });
  }, [view]);

  const handleEventClick = useCallback(
    (event: CalendarEvent, e: React.MouseEvent) => {
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setPopoverPos({
        x: Math.min(rect.right + 8, window.innerWidth - 360),
        y: Math.max(rect.top, 80),
      });
      setSelectedEvent(event);
    },
    [],
  );

  const handleDayClick = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      if (view === "month") setView("day");
    },
    [view],
  );

  const toggleFilterType = useCallback((type: string) => {
    setFilterTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Date label
  const dateLabel = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth();
    if (view === "month") return `${getMonthName(m)} ${y}`;
    if (view === "week") {
      const week = getWeekDates(selectedDate);
      const s = week[0];
      const e = week[6];
      if (s.getMonth() === e.getMonth()) {
        return `${getMonthName(s.getMonth())} ${s.getDate()} - ${e.getDate()}, ${y}`;
      }
      return `${getMonthName(s.getMonth())} ${s.getDate()} - ${getMonthName(e.getMonth())} ${e.getDate()}, ${y}`;
    }
    return selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDate, view]);

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Left Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 overflow-y-auto border-r"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="p-4 space-y-6">
              {/* Mini Month Navigator */}
              <MiniMonthNavigator
                selectedDate={selectedDate}
                onDateSelect={(d) => {
                  setSelectedDate(d);
                  if (view !== "day") setView("day");
                }}
              />

              {/* Event Type Filters */}
              <div>
                <h3
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Event Types
                </h3>
                <div className="space-y-1.5">
                  {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => (
                    <label
                      key={type}
                      className="flex items-center gap-2.5 cursor-pointer py-1 px-2 rounded-md transition-colors hover:bg-[var(--surface-1)]"
                    >
                      <input
                        type="checkbox"
                        checked={filterTypes.has(type)}
                        onChange={() => toggleFilterType(type)}
                        className="sr-only"
                      />
                      <span
                        className="w-3 h-3 rounded-sm flex-shrink-0 transition-opacity"
                        style={{
                          backgroundColor: EVENT_TYPE_COLORS[type],
                          opacity: filterTypes.has(type) ? 1 : 0.25,
                        }}
                      />
                      <span
                        className="text-sm"
                        style={{
                          color: filterTypes.has(type)
                            ? "var(--text-primary)"
                            : "var(--text-tertiary)",
                        }}
                      >
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Color Legend */}
              <div>
                <h3
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Impact Levels
                </h3>
                <div className="space-y-1.5">
                  {Object.entries(IMPACT_COLORS).map(([level, color]) => (
                    <div key={level} className="flex items-center gap-2.5 py-0.5 px-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span
                        className="text-xs capitalize"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Create Freeze Period */}
              <button
                onClick={() => setShowFreezeModal(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  color: "#EF4444",
                }}
              >
                <Snowflake className="w-4 h-4" />
                New Freeze Period
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Toolbar */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-1.5 rounded-md transition-colors hover:bg-[var(--surface-1)]"
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              ) : (
                <PanelLeftOpen className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              )}
            </button>

            <button
              onClick={goToday}
              className="px-3 py-1.5 text-sm font-medium rounded-md border transition-colors hover:bg-[var(--surface-1)]"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              Today
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={goPrev}
                className="p-1.5 rounded-md transition-colors hover:bg-[var(--surface-1)]"
              >
                <ChevronLeft className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              </button>
              <button
                onClick={goNext}
                className="p-1.5 rounded-md transition-colors hover:bg-[var(--surface-1)]"
              >
                <ChevronRight className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>

            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {dateLabel}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div
              className="flex rounded-lg border overflow-hidden"
              style={{ borderColor: "var(--border)" }}
            >
              {(["month", "week", "day"] as CalendarView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="px-3 py-1.5 text-sm font-medium capitalize transition-colors"
                  style={{
                    backgroundColor: view === v ? "var(--primary)" : "transparent",
                    color: view === v ? "white" : "var(--text-secondary)",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* New Window Button */}
            <button
              onClick={() => {
                setEditingEvent(null);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <Plus className="w-4 h-4" />
              New Window
            </button>
          </div>
        </div>

        {/* Calendar Body */}
        <div className="flex-1 overflow-auto relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-[var(--surface-0)]/50">
              <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Loading events...</span>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={`${view}-${selectedDate.toISOString()}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {view === "month" && (
                <MonthView
                  date={selectedDate}
                  events={filteredEvents}
                  onDayClick={handleDayClick}
                  onEventClick={handleEventClick}
                />
              )}
              {view === "week" && (
                <WeekView
                  date={selectedDate}
                  events={filteredEvents}
                  onEventClick={handleEventClick}
                  onDayClick={handleDayClick}
                />
              )}
              {view === "day" && (
                <DayView
                  date={selectedDate}
                  events={filteredEvents}
                  onEventClick={handleEventClick}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Event Detail Popover */}
      {selectedEvent && popoverPos && (
        <EventDetailPopover
          ref={popoverRef}
          event={selectedEvent}
          position={popoverPos}
          onClose={() => {
            setSelectedEvent(null);
            setPopoverPos(null);
          }}
          onEdit={() => {
            setEditingEvent(selectedEvent);
            setShowCreateModal(true);
            setSelectedEvent(null);
            setPopoverPos(null);
          }}
          onDelete={() => {
            setSelectedEvent(null);
            setPopoverPos(null);
          }}
        />
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <MaintenanceWindowModal
          event={editingEvent}
          onClose={() => {
            setShowCreateModal(false);
            setEditingEvent(null);
          }}
        />
      )}

      {/* Freeze Period Modal */}
      {showFreezeModal && (
        <FreezePeriodModal onClose={() => setShowFreezeModal(false)} />
      )}
    </div>
  );
}

/* ================================================================== */
/*  Mini Month Navigator                                               */
/* ================================================================== */

function MiniMonthNavigator({
  selectedDate,
  onDateSelect,
}: {
  selectedDate: Date;
  onDateSelect: (d: Date) => void;
}) {
  const [navDate, setNavDate] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );

  const grid = useMemo(
    () => getMonthGrid(navDate.getFullYear(), navDate.getMonth()),
    [navDate],
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() =>
            setNavDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
          }
          className="p-1 rounded hover:bg-[var(--surface-1)]"
        >
          <ChevronLeft className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
        </button>
        <span
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {getMonthName(navDate.getMonth())} {navDate.getFullYear()}
        </span>
        <button
          onClick={() =>
            setNavDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
          }
          className="p-1 rounded hover:bg-[var(--surface-1)]"
        >
          <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0">
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium py-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            {d.charAt(0)}
          </div>
        ))}
        {grid.flat().map((date, idx) => {
          const isCurrentMonth = date.getMonth() === navDate.getMonth();
          const isSelected = isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);

          return (
            <button
              key={idx}
              onClick={() => onDateSelect(date)}
              className="text-center text-[11px] py-0.5 rounded-md transition-colors"
              style={{
                backgroundColor: isSelected
                  ? "var(--primary)"
                  : isTodayDate
                    ? "var(--surface-2)"
                    : "transparent",
                color: isSelected
                  ? "white"
                  : isCurrentMonth
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
                fontWeight: isTodayDate || isSelected ? 600 : 400,
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Month View                                                         */
/* ================================================================== */

function MonthView({
  date,
  events,
  onDayClick,
  onEventClick,
}: {
  date: Date;
  events: CalendarEvent[];
  onDayClick: (d: Date) => void;
  onEventClick: (ev: CalendarEvent, e: React.MouseEvent) => void;
}) {
  const grid = useMemo(
    () => getMonthGrid(date.getFullYear(), date.getMonth()),
    [date],
  );

  const MAX_VISIBLE_EVENTS = 3;

  return (
    <div className="h-full flex flex-col">
      {/* Header row */}
      <div
        className="grid grid-cols-7 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold py-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${grid.length}, 1fr)` }}>
        {grid.map((row, ri) => (
          <div
            key={ri}
            className="grid grid-cols-7 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            {row.map((cellDate, ci) => {
              const isCurrentMonth = cellDate.getMonth() === date.getMonth();
              const isTodayDate = isToday(cellDate);
              const dayEvents = getEventsForDay(events, cellDate);
              const freezeEvents = dayEvents.filter((e) => e.eventType === "freeze");
              const regularEvents = dayEvents.filter((e) => e.eventType !== "freeze");
              const hasOverflow = regularEvents.length > MAX_VISIBLE_EVENTS;
              const visibleEvents = regularEvents.slice(0, MAX_VISIBLE_EVENTS);
              const overflowCount = regularEvents.length - MAX_VISIBLE_EVENTS;

              return (
                <div
                  key={ci}
                  onClick={() => onDayClick(cellDate)}
                  className="relative border-r px-1 py-1 cursor-pointer transition-colors hover:bg-[var(--surface-1)] min-h-0 overflow-hidden"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: freezeEvents.length > 0 ? "rgba(239, 68, 68, 0.05)" : undefined,
                  }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-xs font-medium leading-none ${
                        isTodayDate ? "bg-[var(--primary)] text-white rounded-full w-6 h-6 flex items-center justify-center" : ""
                      }`}
                      style={{
                        color: isTodayDate
                          ? "white"
                          : isCurrentMonth
                            ? "var(--text-primary)"
                            : "var(--text-tertiary)",
                      }}
                    >
                      {cellDate.getDate()}
                    </span>
                    {freezeEvents.length > 0 && (
                      <Snowflake className="w-3 h-3 text-red-500 flex-shrink-0" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {visibleEvents.map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => onEventClick(ev, e)}
                        className="truncate text-[10px] leading-tight px-1.5 py-0.5 rounded cursor-pointer transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: ev.color + "20",
                          color: ev.color,
                          borderLeft: `2px solid ${ev.color}`,
                        }}
                        title={ev.title}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {hasOverflow && (
                      <div
                        className="text-[10px] px-1.5 font-medium"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        +{overflowCount} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Week View                                                          */
/* ================================================================== */

function WeekView({
  date,
  events,
  onEventClick,
  onDayClick,
}: {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (ev: CalendarEvent, e: React.MouseEvent) => void;
  onDayClick: (d: Date) => void;
}) {
  const weekDates = useMemo(() => getWeekDates(date), [date]);
  const hourSlots = useMemo(() => getHourSlots(), []);

  const allDayEvents = useMemo(
    () =>
      events.filter((ev) => {
        if (ev.isAllDay) return true;
        const start = new Date(ev.startTime);
        const end = new Date(ev.endTime);
        return end.getTime() - start.getTime() >= 24 * 60 * 60 * 1000;
      }),
    [events],
  );

  const timedEvents = useMemo(
    () =>
      events.filter((ev) => {
        if (ev.isAllDay) return false;
        const start = new Date(ev.startTime);
        const end = new Date(ev.endTime);
        return end.getTime() - start.getTime() < 24 * 60 * 60 * 1000;
      }),
    [events],
  );

  return (
    <div className="h-full flex flex-col">
      {/* Column Headers */}
      <div
        className="grid border-b flex-shrink-0"
        style={{
          gridTemplateColumns: "64px repeat(7, 1fr)",
          borderColor: "var(--border)",
        }}
      >
        <div className="border-r" style={{ borderColor: "var(--border)" }} />
        {weekDates.map((wd, i) => {
          const isTodayDate = isToday(wd);
          return (
            <div
              key={i}
              onClick={() => onDayClick(wd)}
              className="text-center py-2 border-r cursor-pointer transition-colors hover:bg-[var(--surface-1)]"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="text-xs font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                {DAYS_OF_WEEK[i]}
              </div>
              <div
                className={`text-lg font-semibold mt-0.5 ${
                  isTodayDate
                    ? "bg-[var(--primary)] text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                    : ""
                }`}
                style={{
                  color: isTodayDate ? "white" : "var(--text-primary)",
                }}
              >
                {wd.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-Day Rail */}
      {allDayEvents.length > 0 && (
        <div
          className="grid border-b flex-shrink-0"
          style={{
            gridTemplateColumns: "64px repeat(7, 1fr)",
            borderColor: "var(--border)",
          }}
        >
          <div
            className="text-[10px] font-medium px-2 py-1 border-r flex items-start"
            style={{ color: "var(--text-tertiary)", borderColor: "var(--border)" }}
          >
            All day
          </div>
          {weekDates.map((wd, i) => {
            const dayAllDayEvents = allDayEvents.filter((ev) => {
              const evStart = new Date(ev.startTime);
              const evEnd = new Date(ev.endTime);
              const dayStart = new Date(wd.getFullYear(), wd.getMonth(), wd.getDate());
              const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
              return evStart < dayEnd && evEnd > dayStart;
            });

            return (
              <div
                key={i}
                className="border-r p-0.5 space-y-0.5"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: dayAllDayEvents.some((e) => e.eventType === "freeze")
                    ? "rgba(239, 68, 68, 0.05)"
                    : undefined,
                }}
              >
                {dayAllDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => onEventClick(ev, e)}
                    className="truncate text-[10px] leading-tight px-1.5 py-0.5 rounded cursor-pointer transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: ev.color + "25",
                      color: ev.color,
                    }}
                    title={ev.title}
                  >
                    {ev.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Timed Grid */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: "64px repeat(7, 1fr)",
            gridTemplateRows: `repeat(${hourSlots.length}, 60px)`,
          }}
        >
          {/* Time labels + horizontal lines */}
          {hourSlots.map((label, hi) => (
            <div
              key={`time-${hi}`}
              className="border-r border-b px-2 text-right"
              style={{
                gridColumn: "1",
                gridRow: `${hi + 1}`,
                borderColor: "var(--border)",
              }}
            >
              <span
                className="text-[10px] relative -top-2"
                style={{ color: "var(--text-tertiary)" }}
              >
                {label}
              </span>
            </div>
          ))}

          {/* Day columns */}
          {weekDates.map((wd, di) => (
            <div
              key={`col-${di}`}
              className="relative border-r"
              style={{
                gridColumn: `${di + 2}`,
                gridRow: `1 / span ${hourSlots.length}`,
                borderColor: "var(--border)",
              }}
            >
              {/* Hour borders */}
              {hourSlots.map((_, hi) => (
                <div
                  key={hi}
                  className="border-b absolute w-full"
                  style={{
                    top: `${(hi / hourSlots.length) * 100}%`,
                    height: `${100 / hourSlots.length}%`,
                    borderColor: "var(--border)",
                  }}
                />
              ))}

              {/* Freeze period overlay */}
              {allDayEvents
                .filter((ev) => {
                  if (ev.eventType !== "freeze") return false;
                  const evStart = new Date(ev.startTime);
                  const evEnd = new Date(ev.endTime);
                  const dayStart = new Date(wd.getFullYear(), wd.getMonth(), wd.getDate());
                  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
                  return evStart < dayEnd && evEnd > dayStart;
                })
                .map((ev) => (
                  <div
                    key={`freeze-${ev.id}`}
                    className="absolute inset-0 pointer-events-none"
                    style={{ backgroundColor: "rgba(239, 68, 68, 0.06)" }}
                  />
                ))}

              {/* Positioned timed events */}
              {timedEvents
                .filter((ev) => {
                  const evStart = new Date(ev.startTime);
                  const evEnd = new Date(ev.endTime);
                  const dayStart = new Date(wd.getFullYear(), wd.getMonth(), wd.getDate());
                  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
                  return evStart < dayEnd && evEnd > dayStart;
                })
                .map((ev) => {
                  const { top, height } = getEventTopAndHeight(ev);
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => onEventClick(ev, e)}
                      className="absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 cursor-pointer overflow-hidden transition-opacity hover:opacity-90 z-10"
                      style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        minHeight: "18px",
                        backgroundColor: ev.color + "20",
                        borderLeft: `3px solid ${ev.color}`,
                        color: ev.color,
                      }}
                      title={ev.title}
                    >
                      <div className="text-[10px] font-medium truncate leading-tight">
                        {ev.title}
                      </div>
                      <div className="text-[9px] truncate opacity-80">
                        {formatTime(ev.startTime)}
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Day View                                                           */
/* ================================================================== */

function DayView({
  date,
  events,
  onEventClick,
}: {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (ev: CalendarEvent, e: React.MouseEvent) => void;
}) {
  const hourSlots = useMemo(() => getHourSlots(), []);
  const dayEvents = useMemo(() => getEventsForDay(events, date), [events, date]);

  const allDayEvents = useMemo(
    () =>
      dayEvents.filter((ev) => {
        if (ev.isAllDay) return true;
        const start = new Date(ev.startTime);
        const end = new Date(ev.endTime);
        return end.getTime() - start.getTime() >= 24 * 60 * 60 * 1000;
      }),
    [dayEvents],
  );

  const timedEvents = useMemo(
    () =>
      dayEvents.filter((ev) => {
        if (ev.isAllDay) return false;
        const start = new Date(ev.startTime);
        const end = new Date(ev.endTime);
        return end.getTime() - start.getTime() < 24 * 60 * 60 * 1000;
      }),
    [dayEvents],
  );

  const hasFreezeOverlay = allDayEvents.some((e) => e.eventType === "freeze");

  return (
    <div className="h-full flex flex-col">
      {/* All-Day Rail */}
      {allDayEvents.length > 0 && (
        <div
          className="flex border-b flex-shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="w-16 flex-shrink-0 text-[10px] font-medium px-2 py-2 border-r"
            style={{ color: "var(--text-tertiary)", borderColor: "var(--border)" }}
          >
            All day
          </div>
          <div className="flex-1 p-1 space-y-1">
            {allDayEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={(e) => onEventClick(ev, e)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:opacity-90"
                style={{
                  backgroundColor: ev.color + "15",
                  borderLeft: `3px solid ${ev.color}`,
                }}
              >
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-medium truncate"
                    style={{ color: ev.color }}
                  >
                    {ev.title}
                  </div>
                  {ev.description && (
                    <div
                      className="text-xs truncate mt-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {ev.description}
                    </div>
                  )}
                </div>
                <ImpactBadge level={ev.impactLevel} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timed Slots */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex relative" style={{ minHeight: `${hourSlots.length * 80}px` }}>
          {/* Time column */}
          <div className="w-16 flex-shrink-0">
            {hourSlots.map((label, i) => (
              <div
                key={i}
                className="border-b border-r h-20 px-2 text-right"
                style={{ borderColor: "var(--border)" }}
              >
                <span
                  className="text-[10px] relative -top-2"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Event column */}
          <div className="flex-1 relative">
            {/* Freeze overlay */}
            {hasFreezeOverlay && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ backgroundColor: "rgba(239, 68, 68, 0.06)" }}
              />
            )}

            {/* Hour lines */}
            {hourSlots.map((_, i) => (
              <div
                key={i}
                className="border-b h-20"
                style={{ borderColor: "var(--border)" }}
              />
            ))}

            {/* Positioned timed events — as detailed cards */}
            {timedEvents.map((ev) => {
              const { top, height } = getEventTopAndHeight(ev);
              return (
                <div
                  key={ev.id}
                  onClick={(e) => onEventClick(ev, e)}
                  className="absolute left-2 right-2 rounded-lg px-3 py-2 cursor-pointer transition-opacity hover:opacity-90 overflow-hidden z-10"
                  style={{
                    top: `${top}%`,
                    height: `${Math.max(height, 5)}%`,
                    minHeight: "48px",
                    backgroundColor: ev.color + "15",
                    borderLeft: `4px solid ${ev.color}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div
                        className="text-sm font-medium truncate"
                        style={{ color: ev.color }}
                      >
                        {ev.title}
                      </div>
                      <div
                        className="text-xs mt-0.5 flex items-center gap-1"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <Clock className="w-3 h-3" />
                        {formatTime(ev.startTime)} - {formatTime(ev.endTime)}
                      </div>
                      {ev.description && (
                        <div
                          className="text-xs mt-1 line-clamp-2"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {ev.description}
                        </div>
                      )}
                    </div>
                    <ImpactBadge level={ev.impactLevel} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Event Detail Popover                                               */
/* ================================================================== */

import { forwardRef } from "react";

const EventDetailPopover = forwardRef<
  HTMLDivElement,
  {
    event: CalendarEvent;
    position: { x: number; y: number };
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
  }
>(function EventDetailPopover({ event, position, onClose, onEdit, onDelete }, ref) {
  const deleteMutation = useDeleteMaintenanceWindow();

  const canEdit = event.source === "calendar" && event.eventType !== "freeze";

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this maintenance window?")) return;
    deleteMutation.mutate(event.sourceId, {
      onSuccess: () => onDelete(),
    });
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed z-50 w-80 rounded-xl shadow-xl border overflow-hidden"
      style={{
        top: `${Math.min(position.y, window.innerHeight - 400)}px`,
        left: `${Math.min(position.x, window.innerWidth - 340)}px`,
        backgroundColor: "var(--surface-0)",
        borderColor: "var(--border)",
      }}
    >
      {/* Color banner */}
      <div className="h-2" style={{ backgroundColor: event.color }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-2">
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {event.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <TypeBadge type={event.eventType} />
              <ImpactBadge level={event.impactLevel} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--surface-1)]"
          >
            <X className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>

        {/* Time */}
        <div
          className="flex items-center gap-2 text-xs mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          <Clock className="w-3.5 h-3.5" />
          {formatDateRange(event.startTime, event.endTime, event.isAllDay)}
        </div>

        {/* Status */}
        <div
          className="flex items-center gap-2 text-xs mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span className="capitalize">{event.status}</span>
        </div>

        {/* Description */}
        {event.description && (
          <p
            className="text-xs mt-3 leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {event.description}
          </p>
        )}

        {/* Created by */}
        {event.createdBy && (
          <div
            className="text-[10px] mt-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            Created by {event.createdBy}
          </div>
        )}

        {/* Source link */}
        {event.sourceUrl && (
          <a
            href={event.sourceUrl}
            className="flex items-center gap-1 text-xs mt-2 hover:underline"
            style={{ color: "var(--primary)" }}
          >
            <ExternalLink className="w-3 h-3" />
            View source
          </a>
        )}

        {/* Actions */}
        {canEdit && (
          <div
            className="flex items-center gap-2 mt-4 pt-3 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-[var(--surface-1)]"
              style={{ color: "var(--text-primary)" }}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-red-50"
              style={{ color: "#EF4444" }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
});

/* ================================================================== */
/*  Maintenance Window Modal                                           */
/* ================================================================== */

function MaintenanceWindowModal({
  event,
  onClose,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
}) {
  const isEditing = !!event;
  const createMutation = useCreateMaintenanceWindow();
  const updateMutation = useUpdateMaintenanceWindow(event?.sourceId);

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [windowType, setWindowType] = useState(event?.eventType ?? "maintenance");
  const [impactLevel, setImpactLevel] = useState(event?.impactLevel ?? "none");
  const [isAllDay, setIsAllDay] = useState(event?.isAllDay ?? false);
  const [startTime, setStartTime] = useState(() => {
    if (event) return new Date(event.startTime).toISOString().slice(0, 16);
    const now = new Date();
    now.setMinutes(0);
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16);
  });
  const [endTime, setEndTime] = useState(() => {
    if (event) return new Date(event.endTime).toISOString().slice(0, 16);
    const now = new Date();
    now.setMinutes(0);
    now.setHours(now.getHours() + 3);
    return now.toISOString().slice(0, 16);
  });
  const [affectedServices, setAffectedServices] = useState("");

  const conflictStart = startTime ? new Date(startTime).toISOString() : undefined;
  const conflictEnd = endTime ? new Date(endTime).toISOString() : undefined;
  const { data: conflicts } = useConflictCheck(conflictStart, conflictEnd);

  const hasConflicts =
    conflicts &&
    (conflicts.overlappingEvents.length > 0 || conflicts.freezePeriods.length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const services = affectedServices
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (isEditing && event) {
      const body: UpdateMaintenanceWindowBody = {
        title,
        description: description || undefined,
        windowType,
        impactLevel,
        isAllDay,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        affectedServices: services.length > 0 ? services : undefined,
      };
      updateMutation.mutate(body, { onSuccess: onClose });
    } else {
      const body: CreateMaintenanceWindowBody = {
        title,
        description: description || undefined,
        windowType,
        impactLevel,
        isAllDay,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        affectedServices: services,
      };
      createMutation.mutate(body, { onSuccess: onClose });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg rounded-xl shadow-2xl border overflow-hidden"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "var(--border)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {isEditing ? "Edit Maintenance Window" : "New Maintenance Window"}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--surface-1)]">
            <X className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--primary)]/30"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-1)",
                color: "var(--text-primary)",
              }}
              placeholder="Enter maintenance window title"
            />
          </div>

          {/* Description */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none transition-colors focus:ring-2 focus:ring-[var(--primary)]/30"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-1)",
                color: "var(--text-primary)",
              }}
              placeholder="Describe the maintenance window"
            />
          </div>

          {/* Window Type + Impact Level */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Window Type
              </label>
              <select
                value={windowType}
                onChange={(e) => setWindowType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none appearance-none transition-colors"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-1)",
                  color: "var(--text-primary)",
                }}
              >
                {WINDOW_TYPES.map((wt) => (
                  <option key={wt.value} value={wt.value}>
                    {wt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Impact Level
              </label>
              <select
                value={impactLevel}
                onChange={(e) => setImpactLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none appearance-none transition-colors"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-1)",
                  color: "var(--text-primary)",
                }}
              >
                {IMPACT_LEVELS.map((il) => (
                  <option key={il.value} value={il.value}>
                    {il.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAllDay(!isAllDay)}
              className="relative w-10 h-5 rounded-full transition-colors"
              style={{
                backgroundColor: isAllDay ? "var(--primary)" : "var(--surface-2)",
              }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
                style={{
                  left: isAllDay ? "22px" : "2px",
                }}
              />
            </button>
            <span
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              All day event
            </span>
          </div>

          {/* Start / End Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Start Time *
              </label>
              <input
                type={isAllDay ? "date" : "datetime-local"}
                value={isAllDay ? startTime.slice(0, 10) : startTime}
                onChange={(e) => setStartTime(isAllDay ? e.target.value + "T00:00" : e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--primary)]/30"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-1)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                End Time *
              </label>
              <input
                type={isAllDay ? "date" : "datetime-local"}
                value={isAllDay ? endTime.slice(0, 10) : endTime}
                onChange={(e) => setEndTime(isAllDay ? e.target.value + "T23:59" : e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--primary)]/30"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-1)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          {/* Affected Services */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Affected Services
            </label>
            <input
              type="text"
              value={affectedServices}
              onChange={(e) => setAffectedServices(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors focus:ring-2 focus:ring-[var(--primary)]/30"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-1)",
                color: "var(--text-primary)",
              }}
              placeholder="Service A, Service B, Service C"
            />
            <p
              className="text-[10px] mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Comma-separated list of affected services
            </p>
          </div>

          {/* Conflict Warnings */}
          {hasConflicts && (
            <div
              className="rounded-lg border p-3"
              style={{
                borderColor: "#F59E0B",
                backgroundColor: "rgba(245, 158, 11, 0.08)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" style={{ color: "#F59E0B" }} />
                <span
                  className="text-sm font-medium"
                  style={{ color: "#F59E0B" }}
                >
                  Potential Conflicts Detected
                </span>
              </div>
              {conflicts.overlappingEvents.length > 0 && (
                <div className="space-y-1 mb-2">
                  <p
                    className="text-xs font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Overlapping events:
                  </p>
                  {conflicts.overlappingEvents.map((oe) => (
                    <div
                      key={oe.id}
                      className="text-xs flex items-center gap-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: oe.color }}
                      />
                      {oe.title}
                    </div>
                  ))}
                </div>
              )}
              {conflicts.freezePeriods.length > 0 && (
                <div className="space-y-1">
                  <p
                    className="text-xs font-medium"
                    style={{ color: "#EF4444" }}
                  >
                    Active freeze periods:
                  </p>
                  {conflicts.freezePeriods.map((fp) => (
                    <div
                      key={fp.id}
                      className="text-xs flex items-center gap-1.5"
                      style={{ color: "#EF4444" }}
                    >
                      <Snowflake className="w-3 h-3" />
                      {fp.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-[var(--surface-1)]"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !title}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {isPending ? "Saving..." : isEditing ? "Update Window" : "Create Window"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ================================================================== */
/*  Freeze Period Modal                                                */
/* ================================================================== */

function FreezePeriodModal({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateFreezePeriod();

  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: CreateFreezePeriodBody = {
      name,
      reason: reason || undefined,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime + "T23:59:59").toISOString(),
    };
    createMutation.mutate(body, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md rounded-xl shadow-2xl border overflow-hidden"
        style={{
          backgroundColor: "var(--surface-0)",
          borderColor: "var(--border)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <Snowflake className="w-4 h-4" style={{ color: "#EF4444" }} />
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              New Change Freeze Period
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--surface-1)]">
            <X className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors focus:ring-2 focus:ring-red-500/30"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-1)",
                color: "var(--text-primary)",
              }}
              placeholder="e.g., Year-End Freeze"
            />
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none transition-colors focus:ring-2 focus:ring-red-500/30"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-1)",
                color: "var(--text-primary)",
              }}
              placeholder="Reason for the change freeze"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Start Date *
              </label>
              <input
                type="date"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors focus:ring-2 focus:ring-red-500/30"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-1)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                End Date *
              </label>
              <input
                type="date"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors focus:ring-2 focus:ring-red-500/30"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-1)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          <div
            className="rounded-lg p-3 text-xs"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              color: "#EF4444",
            }}
          >
            During a freeze period, all maintenance windows and deployments will show a conflict warning. No automated changes will be blocked, but schedulers will see prominent warnings.
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-[var(--surface-1)]"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !name}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#EF4444" }}
            >
              {createMutation.isPending ? "Creating..." : "Create Freeze Period"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ================================================================== */
/*  Shared Badge Components                                            */
/* ================================================================== */

function TypeBadge({ type }: { type: string }) {
  const color = EVENT_TYPE_COLORS[type] || "#6B7280";
  const label = EVENT_TYPE_LABELS[type] || type;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{
        backgroundColor: color + "20",
        color: color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function ImpactBadge({ level }: { level: string }) {
  if (!level || level === "none") return null;

  const color = IMPACT_COLORS[level] || "#6B7280";

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase flex-shrink-0"
      style={{
        backgroundColor: color + "18",
        color: color,
      }}
    >
      {level}
    </span>
  );
}
