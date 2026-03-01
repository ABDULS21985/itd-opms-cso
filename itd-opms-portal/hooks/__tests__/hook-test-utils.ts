/**
 * Shared test utilities for hook tests.
 *
 * Provides a reusable wrapper with QueryClientProvider and helpers for
 * creating MSW handlers that mimic the Go API's response envelope format.
 */
import { type ReactNode, createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";

const API = "http://localhost:8089/api/v1";

// ---------------------------------------------------------------------------
// QueryClient wrapper for renderHook
// ---------------------------------------------------------------------------

export function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ---------------------------------------------------------------------------
// MSW handler factories
// ---------------------------------------------------------------------------

/** Create a successful GET handler returning data in the API envelope. */
export function mockGet(path: string, data: unknown, meta?: object) {
  return http.get(`${API}${path}`, () =>
    HttpResponse.json({ status: "success", data, ...(meta ? { meta } : {}) }),
  );
}

/** Create a successful GET handler that matches any query params. */
export function mockGetWithParams(path: string, data: unknown, meta?: object) {
  return http.get(`${API}${path}`, () =>
    HttpResponse.json({ status: "success", data, ...(meta ? { meta } : {}) }),
  );
}

/** Create a GET handler that returns an error. */
export function mockGetError(path: string, status = 500, message = "Server error") {
  return http.get(`${API}${path}`, () =>
    HttpResponse.json({ status: "error", message }, { status }),
  );
}

/** Create a successful POST handler. */
export function mockPost(path: string, data: unknown = {}) {
  return http.post(`${API}${path}`, () =>
    HttpResponse.json({ status: "success", data }),
  );
}

/** Create a successful PUT handler. */
export function mockPut(path: string, data: unknown = {}) {
  return http.put(`${API}${path}`, () =>
    HttpResponse.json({ status: "success", data }),
  );
}

/** Create a successful PATCH handler. */
export function mockPatch(path: string, data: unknown = {}) {
  return http.patch(`${API}${path}`, () =>
    HttpResponse.json({ status: "success", data }),
  );
}

/** Create a successful DELETE handler. */
export function mockDelete(path: string) {
  return http.delete(`${API}${path}`, () =>
    HttpResponse.json({ status: "success" }),
  );
}

/** Create POST handler that returns an error. */
export function mockPostError(path: string, status = 500, message = "Server error") {
  return http.post(`${API}${path}`, () =>
    HttpResponse.json({ status: "error", message }, { status }),
  );
}

// ---------------------------------------------------------------------------
// Sample paginated response meta
// ---------------------------------------------------------------------------

export const paginatedMeta = {
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 1,
};
