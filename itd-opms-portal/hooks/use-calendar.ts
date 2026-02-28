import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  eventType: string;
  status: string;
  impactLevel: string;
  source: string;
  sourceId: string;
  sourceUrl: string;
  color: string;
  createdBy: string;
}

export interface MaintenanceWindow {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  windowType: string;
  status: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  recurrenceRule: string | null;
  affectedServices: string[];
  impactLevel: string;
  changeRequestId: string | null;
  ticketId: string | null;
  projectId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeFreezePeriod {
  id: string;
  tenantId: string;
  name: string;
  reason: string | null;
  startTime: string;
  endTime: string;
  exceptions: unknown[];
  createdBy: string;
  createdAt: string;
}

export interface ConflictResult {
  overlappingEvents: CalendarEvent[];
  freezePeriods: ChangeFreezePeriod[];
}

export interface CreateMaintenanceWindowBody {
  title: string;
  description?: string;
  windowType: string;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  recurrenceRule?: string;
  affectedServices?: string[];
  impactLevel?: string;
  changeRequestId?: string;
  ticketId?: string;
  projectId?: string;
}

export interface UpdateMaintenanceWindowBody {
  title?: string;
  description?: string;
  windowType?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  recurrenceRule?: string;
  affectedServices?: string[];
  impactLevel?: string;
  changeRequestId?: string;
  ticketId?: string;
  projectId?: string;
}

export interface CreateFreezePeriodBody {
  name: string;
  reason?: string;
  startTime: string;
  endTime: string;
  exceptions?: unknown[];
}

/* ================================================================== */
/*  Calendar Events — Queries                                          */
/* ================================================================== */

/**
 * GET /calendar/events - aggregated calendar events for a date range.
 */
export function useCalendarEvents(
  startDate: string | undefined,
  endDate: string | undefined,
  types?: string[],
) {
  return useQuery({
    queryKey: ["calendar-events", startDate, endDate, types],
    queryFn: () =>
      apiClient.get<CalendarEvent[]>("/calendar/events", {
        start: startDate,
        end: endDate,
        types: types?.join(","),
      }),
    enabled: !!startDate && !!endDate,
  });
}

/* ================================================================== */
/*  Maintenance Windows — Queries                                      */
/* ================================================================== */

/**
 * GET /calendar/maintenance-windows/{id} - single maintenance window.
 */
export function useMaintenanceWindow(id: string | undefined) {
  return useQuery({
    queryKey: ["maintenance-window", id],
    queryFn: () =>
      apiClient.get<MaintenanceWindow>(
        `/calendar/maintenance-windows/${id}`,
      ),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Maintenance Windows — Mutations                                    */
/* ================================================================== */

/**
 * POST /calendar/maintenance-windows - create a maintenance window.
 */
export function useCreateMaintenanceWindow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMaintenanceWindowBody) =>
      apiClient.post<MaintenanceWindow>(
        "/calendar/maintenance-windows",
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-conflicts"] });
      toast.success("Maintenance window created successfully");
    },
    onError: () => {
      toast.error("Failed to create maintenance window");
    },
  });
}

/**
 * PUT /calendar/maintenance-windows/{id} - update a maintenance window.
 */
export function useUpdateMaintenanceWindow(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMaintenanceWindowBody) =>
      apiClient.put<MaintenanceWindow>(
        `/calendar/maintenance-windows/${id}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({
        queryKey: ["maintenance-window", id],
      });
      queryClient.invalidateQueries({ queryKey: ["calendar-conflicts"] });
      toast.success("Maintenance window updated successfully");
    },
    onError: () => {
      toast.error("Failed to update maintenance window");
    },
  });
}

/**
 * DELETE /calendar/maintenance-windows/{id} - delete a maintenance window.
 */
export function useDeleteMaintenanceWindow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/calendar/maintenance-windows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-conflicts"] });
      toast.success("Maintenance window deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete maintenance window");
    },
  });
}

/* ================================================================== */
/*  Freeze Periods — Queries                                           */
/* ================================================================== */

/**
 * GET /calendar/freeze-periods - all freeze periods.
 */
export function useFreezePeriods() {
  return useQuery({
    queryKey: ["freeze-periods"],
    queryFn: () =>
      apiClient.get<ChangeFreezePeriod[]>("/calendar/freeze-periods"),
  });
}

/* ================================================================== */
/*  Freeze Periods — Mutations                                         */
/* ================================================================== */

/**
 * POST /calendar/freeze-periods - create a freeze period.
 */
export function useCreateFreezePeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFreezePeriodBody) =>
      apiClient.post<ChangeFreezePeriod>(
        "/calendar/freeze-periods",
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freeze-periods"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-conflicts"] });
      toast.success("Freeze period created successfully");
    },
    onError: () => {
      toast.error("Failed to create freeze period");
    },
  });
}

/**
 * DELETE /calendar/freeze-periods/{id} - delete a freeze period.
 */
export function useDeleteFreezePeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/calendar/freeze-periods/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freeze-periods"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-conflicts"] });
      toast.success("Freeze period deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete freeze period");
    },
  });
}

/* ================================================================== */
/*  Conflict Check                                                     */
/* ================================================================== */

/**
 * GET /calendar/conflicts - check for conflicts in a time range.
 */
export function useConflictCheck(
  start: string | undefined,
  end: string | undefined,
) {
  return useQuery({
    queryKey: ["calendar-conflicts", start, end],
    queryFn: () =>
      apiClient.get<ConflictResult>("/calendar/conflicts", {
        start,
        end,
      }),
    enabled: !!start && !!end,
  });
}
