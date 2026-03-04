import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { server } from "@/test/mocks/server";
import {
  createWrapper,
  mockGet,
  mockPost,
  mockPut,
  paginatedMeta,
} from "./hook-test-utils";
import {
  useNotifications,
  useUnreadCount,
  useNotificationPreferences,
  useMarkAsRead,
  useMarkAllAsRead,
  useUpdateNotificationPreferences,
} from "@/hooks/use-notifications";

describe("useNotifications", () => {
  it("fetches paginated notifications", async () => {
    const notification = { id: "n-1", title: "Test", isRead: false };
    server.use(mockGet("/notifications", [notification], paginatedMeta));

    const { result } = renderHook(() => useNotifications(1, 20), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      data: [notification],
      meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });
  });
});

describe("useUnreadCount", () => {
  it("fetches unread notification count", async () => {
    server.use(mockGet("/notifications/unread-count", { unreadCount: 5 }));

    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(5);
  });
});

describe("useNotificationPreferences", () => {
  it("fetches notification preferences", async () => {
    const prefs = { email: true, inApp: true, push: false };
    server.use(mockGet("/notifications/preferences", prefs));

    const { result } = renderHook(() => useNotificationPreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(prefs);
  });
});

describe("useMarkAsRead", () => {
  it("calls POST /notifications/{id}/read", async () => {
    server.use(mockPost("/notifications/n-1/read"));

    const { result } = renderHook(() => useMarkAsRead(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("n-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useMarkAllAsRead", () => {
  it("calls POST /notifications/read-all", async () => {
    server.use(mockPost("/notifications/read-all"));

    const { result } = renderHook(() => useMarkAllAsRead(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateNotificationPreferences", () => {
  it("calls PUT /notifications/preferences", async () => {
    const prefs = { email: true, inApp: false, push: true };
    server.use(mockPut("/notifications/preferences", prefs));

    const { result } = renderHook(() => useUpdateNotificationPreferences(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(prefs as any);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
