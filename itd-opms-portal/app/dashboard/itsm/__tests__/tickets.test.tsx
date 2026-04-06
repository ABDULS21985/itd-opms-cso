import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/test/test-utils";

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
}));

function stripMotionProps(props: Record<string, unknown>) {
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

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => (
      <div {...stripMotionProps(props)}>{children}</div>
    ),
    form: ({ children, ...props }: any) => (
      <form {...stripMotionProps(props)}>{children}</form>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

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

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/export-utils", () => ({
  exportToCSV: vi.fn(),
}));

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
            {columns?.map((column: any) => (
              <th key={column.key}>{column.header}</th>
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
  InlineSelect: ({ renderValue }: any) => (renderValue ? renderValue() : null),
}));

vi.mock("@/components/shared/export-dropdown", () => ({
  ExportDropdown: () => <button>Export</button>,
}));

const mockUseTickets = vi.fn();
const mockUseTicketStats = vi.fn();
const mockUseBulkUpdateTickets = vi.fn();

vi.mock("@/hooks/use-itsm", () => ({
  useTickets: (...args: any[]) => mockUseTickets(...args),
  useTicketStats: (...args: any[]) => mockUseTicketStats(...args),
  useBulkUpdateTickets: (...args: any[]) => mockUseBulkUpdateTickets(...args),
}));

import TicketsPage from "../tickets/page";

const mockTickets = [
  {
    id: "t-1",
    ticketNumber: "TKT-001",
    title: "Email server down",
    type: "incident",
    priority: "P1_critical",
    status: "in_progress",
    assigneeId: "user-1",
    assigneeName: "Admin User",
    reporterId: "reporter-1",
    reporterName: "Nora Reporter",
    teamQueueId: "queue-1",
    teamQueueName: "Service Desk",
    createdAt: "2026-03-15T10:00:00Z",
    slaResolutionMet: null,
    slaResponseMet: null,
    slaPausedAt: null,
    slaResolutionTarget: null,
    isMajorIncident: true,
  },
  {
    id: "t-2",
    ticketNumber: "TKT-002",
    title: "VPN connection issues",
    type: "service_request",
    priority: "P3_medium",
    status: "logged",
    assigneeId: null,
    assigneeName: null,
    reporterId: "reporter-2",
    reporterName: "Musa Requester",
    teamQueueId: "queue-2",
    teamQueueName: "Network",
    createdAt: "2026-03-16T14:30:00Z",
    slaResolutionMet: null,
    slaResponseMet: null,
    slaPausedAt: null,
    slaResolutionTarget: null,
    isMajorIncident: false,
  },
];

function setLoadedState() {
  mockUseTickets.mockReturnValue({
    data: {
      data: mockTickets,
      meta: { page: 1, totalPages: 1, totalItems: 2, pageSize: 20 },
    },
    isLoading: false,
  });

  mockUseTicketStats.mockReturnValue({
    data: {
      total: 150,
      openCount: 42,
      slaBreachedCount: 5,
      majorIncidents: 2,
    },
    isLoading: false,
  });
}

function setEmptyState() {
  mockUseTickets.mockReturnValue({
    data: {
      data: [],
      meta: { page: 1, totalPages: 1, totalItems: 0, pageSize: 20 },
    },
    isLoading: false,
  });

  mockUseTicketStats.mockReturnValue({
    data: {
      total: 0,
      openCount: 0,
      slaBreachedCount: 0,
      majorIncidents: 0,
    },
    isLoading: false,
  });
}

describe("TicketsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockReset();
    mockUseBulkUpdateTickets.mockReturnValue({ mutateAsync: vi.fn() });
  });

  it("renders the upgraded ticket command workspace", () => {
    setLoadedState();

    render(<TicketsPage />);

    expect(screen.getByText("Tickets")).toBeInTheDocument();
    expect(screen.getByText(/Ticket operations desk/)).toBeInTheDocument();
    expect(screen.getByText("Ticket command board")).toBeInTheDocument();
    expect(screen.getByText("Coverage pressure")).toBeInTheDocument();
    expect(screen.getByText("Visible mix")).toBeInTheDocument();
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-row-t-1")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-row-t-2")).toBeInTheDocument();
    expect(screen.getByText("TKT-001")).toBeInTheDocument();
    expect(screen.getByText("TKT-002")).toBeInTheDocument();
  });

  it("reveals the filter workspace when Filters is clicked", async () => {
    setLoadedState();
    const user = userEvent.setup();

    render(<TicketsPage />);

    await user.click(screen.getAllByRole("button", { name: "Filters" })[0]);

    expect(screen.getByDisplayValue("All Statuses")).toBeInTheDocument();
    expect(screen.getByDisplayValue("All Priorities")).toBeInTheDocument();
    expect(screen.getByDisplayValue("All Types")).toBeInTheDocument();
  });

  it("renders the stronger empty state when no tickets exist", () => {
    setEmptyState();

    render(<TicketsPage />);

    expect(screen.getByTestId("data-table-empty")).toBeInTheDocument();
    expect(screen.getByText("No tickets found")).toBeInTheDocument();
    expect(
      screen.getByText("Create your first ticket to get started."),
    ).toBeInTheDocument();
  });

  it("shows the upgraded stats cards", () => {
    setLoadedState();

    render(<TicketsPage />);

    expect(screen.getAllByText("Total Tickets").length).toBeGreaterThan(0);
    expect(screen.getAllByText("150").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Open").length).toBeGreaterThan(0);
    expect(screen.getAllByText("42").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SLA Breached").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Major Incidents").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
  });
});
