import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@/test/test-utils";
import { render } from "@/test/test-utils";

// =============================================================================
// Mock: framer-motion — render children immediately
// =============================================================================
vi.mock("framer-motion", () => {
  const React = require("react");
  const motion = new Proxy(
    {},
    {
      get:
        (_target: unknown, prop: string) =>
        ({ children, ...rest }: Record<string, unknown>) =>
          React.createElement(prop, rest, children),
    },
  );
  return {
    __esModule: true,
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// =============================================================================
// Mock: @/hooks/use-governance
// =============================================================================
const mockUsePolicies = vi.fn();

vi.mock("@/hooks/use-governance", () => ({
  usePolicies: (...args: unknown[]) => mockUsePolicies(...args),
}));

// =============================================================================
// Mock: @/components/shared/data-table
// =============================================================================
vi.mock("@/components/shared/data-table", () => {
  const React = require("react");
  return {
    DataTable: ({
      data,
      loading,
      emptyTitle,
      emptyDescription,
      columns,
    }: {
      data: unknown[];
      loading: boolean;
      emptyTitle?: string;
      emptyDescription?: string;
      columns: { header: string }[];
    }) => {
      if (loading) {
        return React.createElement("div", { "data-testid": "loading-skeleton" }, "Loading...");
      }
      if (data.length === 0) {
        return React.createElement(
          "div",
          { "data-testid": "empty-state" },
          React.createElement("p", null, emptyTitle),
          React.createElement("p", null, emptyDescription),
        );
      }
      return React.createElement(
        "table",
        { "data-testid": "data-table" },
        React.createElement(
          "thead",
          null,
          React.createElement(
            "tr",
            null,
            columns.map((col: { header: string }, i: number) =>
              React.createElement("th", { key: i }, col.header),
            ),
          ),
        ),
        React.createElement(
          "tbody",
          null,
          data.map((item: Record<string, unknown>, i: number) =>
            React.createElement(
              "tr",
              { key: (item.id as string) ?? i },
              React.createElement("td", null, item.title as string),
            ),
          ),
        ),
      );
    },
  };
});

// =============================================================================
// Mock: @/components/shared/status-badge
// =============================================================================
vi.mock("@/components/shared/status-badge", () => {
  const React = require("react");
  return {
    StatusBadge: ({ status }: { status: string }) =>
      React.createElement("span", { "data-testid": "status-badge" }, status),
  };
});

// =============================================================================
// Import after mocks
// =============================================================================
import PoliciesPage from "../policies/page";

// =============================================================================
// Test data
// =============================================================================
const mockPolicies = [
  {
    id: "pol-1",
    title: "Information Security Policy",
    description: "Governs information security practices",
    category: "security",
    status: "published",
    version: 2,
    effectiveDate: "2025-01-15T00:00:00Z",
    ownerId: "user-abc-12345678",
    tenantId: "tenant-1",
    createdAt: "2024-06-01T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  },
  {
    id: "pol-2",
    title: "Data Retention Policy",
    description: "Defines data retention requirements",
    category: "compliance",
    status: "draft",
    version: 1,
    effectiveDate: null,
    ownerId: "user-def-87654321",
    tenantId: "tenant-1",
    createdAt: "2025-02-01T00:00:00Z",
    updatedAt: "2025-02-01T00:00:00Z",
  },
];

const mockMeta = {
  page: 1,
  pageSize: 20,
  totalItems: 2,
  totalPages: 1,
};

// =============================================================================
// Tests
// =============================================================================
describe("PoliciesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page header with title and description", { timeout: 15000 }, () => {
    mockUsePolicies.mockReturnValue({
      data: { data: mockPolicies, meta: mockMeta },
      isLoading: false,
    });

    render(<PoliciesPage />);

    expect(screen.getByText("Policies")).toBeInTheDocument();
    expect(
      screen.getByText("Manage organizational policies, approvals, and attestations"),
    ).toBeInTheDocument();
  });

  it("renders a loading skeleton while data is being fetched", () => {
    mockUsePolicies.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<PoliciesPage />);

    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("renders the empty state when no policies exist", () => {
    mockUsePolicies.mockReturnValue({
      data: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } },
      isLoading: false,
    });

    render(<PoliciesPage />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("No policies found")).toBeInTheDocument();
    expect(
      screen.getByText("Get started by creating your first policy."),
    ).toBeInTheDocument();
  });

  it("renders policies in the data table when data is available", () => {
    mockUsePolicies.mockReturnValue({
      data: { data: mockPolicies, meta: mockMeta },
      isLoading: false,
    });

    render(<PoliciesPage />);

    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.getByText("Information Security Policy")).toBeInTheDocument();
    expect(screen.getByText("Data Retention Policy")).toBeInTheDocument();
  });

  it("shows the 'New Policy' button", () => {
    mockUsePolicies.mockReturnValue({
      data: { data: mockPolicies, meta: mockMeta },
      isLoading: false,
    });

    render(<PoliciesPage />);

    expect(screen.getByText("New Policy")).toBeInTheDocument();
  });

  it("shows the 'Filters' button", () => {
    mockUsePolicies.mockReturnValue({
      data: { data: mockPolicies, meta: mockMeta },
      isLoading: false,
    });

    render(<PoliciesPage />);

    expect(screen.getByText("Filters")).toBeInTheDocument();
  });
});
