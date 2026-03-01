import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard/itsm/tickets",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock framer-motion to render children directly
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...stripMotionProps(props)}>{children}</div>,
    form: ({ children, ...props }: any) => <form {...stripMotionProps(props)}>{children}</form>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

function stripMotionProps(props: Record<string, any>) {
  const {
    initial,
    animate,
    exit,
    transition,
    whileHover,
    whileTap,
    whileFocus,
    layout,
    layoutId,
    variants,
    ...rest
  } = props;
  return rest;
}

// Mock auth provider
vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "admin@test.com",
      displayName: "Admin User",
      roles: ["admin"],
      permissions: ["*"],
      tenantId: "tenant-1",
    },
    isLoading: false,
    isLoggedIn: true,
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock api-client
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock export-utils
vi.mock("@/lib/export-utils", () => ({
  exportToCSV: vi.fn(),
}));

// Mock shared components that use complex internals
vi.mock("@/components/shared/data-table", () => ({
  DataTable: ({
    data,
    loading,
    emptyTitle,
    emptyDescription,
    columns,
  }: any) => {
    if (loading) {
      return <div data-testid="data-table-loading">Loading...</div>;
    }
    if (!data || data.length === 0) {
      return (
        <div data-testid="data-table-empty">
          <p>{emptyTitle}</p>
          {emptyDescription && <p>{emptyDescription}</p>}
        </div>
      );
    }
    return (
      <table data-testid="data-table">
        <thead>
          <tr>
            {columns?.map((col: any) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item: any) => (
            <tr key={item.id} data-testid={`ticket-row-${item.id}`}>
              <td>{item.ticketNumber}</td>
              <td>{item.title}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
}));

vi.mock("@/components/shared/status-badge", () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

vi.mock("@/components/shared/inline-edit", () => ({
  InlineSelect: ({ renderValue }: any) =>
    renderValue ? renderValue() : null,
  InlineText: ({ value }: any) => <span>{value}</span>,
}));

vi.mock("@/components/shared/export-dropdown", () => ({
  ExportDropdown: () => <button>Export</button>,
}));

// ---------------------------------------------------------------------------
// ITSM hook mocks – must be hoisted
// ---------------------------------------------------------------------------

const mockUseTickets = vi.fn();
const mockUseTicketStats = vi.fn();
const mockUseBulkUpdateTickets = vi.fn();

vi.mock("@/hooks/use-itsm", () => ({
  useTickets: (...args: any[]) => mockUseTickets(...args),
  useTicketStats: (...args: any[]) => mockUseTicketStats(...args),
  useBulkUpdateTickets: (...args: any[]) => mockUseBulkUpdateTickets(...args),
}));

// ---------------------------------------------------------------------------
// Import component under test AFTER mocks
// ---------------------------------------------------------------------------

import TicketsPage from "../tickets/page";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TicketsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBulkUpdateTickets.mockReturnValue({ mutateAsync: vi.fn() });
  });

  it("renders loading state when tickets are loading", () => {
    mockUseTickets.mockReturnValue({ data: undefined, isLoading: true });
    mockUseTicketStats.mockReturnValue({ data: undefined });

    render(<TicketsPage />);

    expect(screen.getByTestId("data-table-loading")).toBeInTheDocument();
  });

  it("renders empty state when there are no tickets", () => {
    mockUseTickets.mockReturnValue({
      data: { data: [], meta: { page: 1, totalPages: 1, totalItems: 0, pageSize: 20 } },
      isLoading: false,
    });
    mockUseTicketStats.mockReturnValue({ data: undefined });

    render(<TicketsPage />);

    expect(screen.getByTestId("data-table-empty")).toBeInTheDocument();
    expect(screen.getByText("No tickets found")).toBeInTheDocument();
  });

  it("renders ticket list when data is available", () => {
    const mockTickets = [
      {
        id: "t-1",
        ticketNumber: "TKT-001",
        title: "Email server down",
        type: "incident",
        priority: "P1_critical",
        status: "in_progress",
        assigneeId: "user-1",
        createdAt: "2025-01-15T10:00:00Z",
        slaResolutionMet: null,
        slaResponseMet: null,
        slaPausedAt: null,
        slaResolutionTarget: null,
        isMajorIncident: false,
      },
      {
        id: "t-2",
        ticketNumber: "TKT-002",
        title: "VPN connection issues",
        type: "service_request",
        priority: "P3_medium",
        status: "new",
        assigneeId: null,
        createdAt: "2025-01-16T14:30:00Z",
        slaResolutionMet: null,
        slaResponseMet: null,
        slaPausedAt: null,
        slaResolutionTarget: null,
        isMajorIncident: false,
      },
    ];

    mockUseTickets.mockReturnValue({
      data: {
        data: mockTickets,
        meta: { page: 1, totalPages: 1, totalItems: 2, pageSize: 20 },
      },
      isLoading: false,
    });
    mockUseTicketStats.mockReturnValue({ data: undefined });

    render(<TicketsPage />);

    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-row-t-1")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-row-t-2")).toBeInTheDocument();
    expect(screen.getByText("TKT-001")).toBeInTheDocument();
    expect(screen.getByText("TKT-002")).toBeInTheDocument();
  });

  it("renders ticket stats when stats data is available", () => {
    mockUseTickets.mockReturnValue({
      data: { data: [], meta: { page: 1, totalPages: 1, totalItems: 0, pageSize: 20 } },
      isLoading: false,
    });
    mockUseTicketStats.mockReturnValue({
      data: {
        total: 150,
        openCount: 42,
        slaBreachedCount: 5,
        majorIncidents: 2,
      },
    });

    render(<TicketsPage />);

    expect(screen.getByText("Total Tickets")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("SLA Breached")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Major Incidents")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders page heading and description", () => {
    mockUseTickets.mockReturnValue({ data: undefined, isLoading: true });
    mockUseTicketStats.mockReturnValue({ data: undefined });

    render(<TicketsPage />);

    expect(screen.getByText("Tickets")).toBeInTheDocument();
    expect(
      screen.getByText("View and manage incidents, service requests, and changes"),
    ).toBeInTheDocument();
  });

  it("renders Create Ticket button", () => {
    mockUseTickets.mockReturnValue({ data: undefined, isLoading: true });
    mockUseTicketStats.mockReturnValue({ data: undefined });

    render(<TicketsPage />);

    expect(screen.getByText("Create Ticket")).toBeInTheDocument();
  });

  it("renders Filters button", () => {
    mockUseTickets.mockReturnValue({ data: undefined, isLoading: true });
    mockUseTicketStats.mockReturnValue({ data: undefined });

    render(<TicketsPage />);

    expect(screen.getByText("Filters")).toBeInTheDocument();
  });
});
