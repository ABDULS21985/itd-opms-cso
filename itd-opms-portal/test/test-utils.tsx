import { type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

// =============================================================================
// Create a fresh QueryClient per test (no retries, no refetching)
// =============================================================================
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// =============================================================================
// All-in-one provider wrapper for tests
// =============================================================================
function AllProviders({ children }: { children: ReactNode }) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// =============================================================================
// Custom render that wraps with providers
// =============================================================================
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// =============================================================================
// Helper: create a mock API response envelope
// =============================================================================
export function createMockApiResponse<T>(
  data: T,
  meta?: {
    page?: number;
    pageSize?: number;
    totalItems?: number;
    totalPages?: number;
  },
) {
  return {
    status: "success" as const,
    data,
    ...(meta ? { meta } : {}),
  };
}

// =============================================================================
// Re-export everything from testing-library + override render
// =============================================================================
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
export { customRender as render };
export { createTestQueryClient };
