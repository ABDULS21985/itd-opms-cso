import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent, waitFor } from "@/test/test-utils";

vi.mock("framer-motion", () => {
  const React = require("react");
  const motion = new Proxy(
    {},
    {
      get:
        (_target: unknown, prop: string) =>
        ({ children, ...rest }: Record<string, unknown>) => {
          const {
            initial,
            animate,
            exit,
            transition,
            layout,
            layoutId,
            whileHover,
            whileTap,
            whileFocus,
            variants,
            ...safeRest
          } = rest;
          return React.createElement(prop, safeRest, children);
        },
    },
  );

  return {
    __esModule: true,
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      displayName: "Ada Analyst",
    },
  }),
}));

vi.mock("@/components/shared/status-badge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

const mockUseMyQueue = vi.fn();
const mockUseTransitionTicket = vi.fn();
const mockUseAddComment = vi.fn();

vi.mock("@/hooks/use-itsm", () => ({
  useMyQueue: (...args: unknown[]) => mockUseMyQueue(...args),
  useTransitionTicket: (...args: unknown[]) => mockUseTransitionTicket(...args),
  useAddComment: (...args: unknown[]) => mockUseAddComment(...args),
}));

import MyQueuePage from "../my-queue/page";

const queueTickets = [
  {
    id: "ticket-1",
    tenantId: "tenant-1",
    ticketNumber: "INC-1042",
    type: "incident",
    category: "messaging",
    subcategory: "gateway",
    title: "Email gateway outage",
    description: "Inbound mail is delayed.",
    priority: "P1_critical",
    urgency: "high",
    impact: "high",
    status: "in_progress",
    channel: "portal",
    reporterId: "reporter-1",
    reporterName: "Nora Reporter",
    assigneeId: "user-1",
    assigneeName: "Ada Analyst",
    teamQueueId: "queue-1",
    teamQueueName: "Service Desk",
    slaResolutionTarget: "2099-03-28T15:00:00.000Z",
    slaResolutionMet: true,
    slaPausedDurationMinutes: 0,
    isMajorIncident: true,
    relatedTicketIds: [],
    linkedAssetIds: [],
    tags: [],
    createdAt: "2026-03-28T10:00:00.000Z",
    updatedAt: "2026-03-28T12:30:00.000Z",
  },
  {
    id: "ticket-2",
    tenantId: "tenant-1",
    ticketNumber: "REQ-2088",
    type: "service_request",
    category: "endpoint",
    subcategory: "software",
    title: "Laptop software refresh",
    description: "Refresh endpoint software for finance.",
    priority: "P3_medium",
    urgency: "medium",
    impact: "medium",
    status: "pending_customer",
    channel: "email",
    reporterId: "reporter-2",
    reporterName: "Musa Requester",
    assigneeId: "user-1",
    assigneeName: "Ada Analyst",
    teamQueueId: "queue-2",
    teamQueueName: "Fulfilment",
    slaResolutionTarget: "2099-03-29T15:00:00.000Z",
    slaResolutionMet: true,
    slaPausedDurationMinutes: 0,
    isMajorIncident: false,
    relatedTicketIds: [],
    linkedAssetIds: [],
    tags: [],
    createdAt: "2026-03-28T11:00:00.000Z",
    updatedAt: "2026-03-28T12:00:00.000Z",
  },
];

function setLoadedState() {
  mockUseMyQueue.mockReturnValue({
    data: {
      data: queueTickets,
      meta: {
        page: 1,
        pageSize: 50,
        totalItems: 2,
        totalPages: 1,
      },
    },
    isLoading: false,
  });
}

function setEmptyState() {
  mockUseMyQueue.mockReturnValue({
    data: {
      data: [],
      meta: {
        page: 1,
        pageSize: 50,
        totalItems: 0,
        totalPages: 0,
      },
    },
    isLoading: false,
  });
}

describe("MyQueuePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockReset();
    mockUseTransitionTicket.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseAddComment.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("renders the upgraded personal queue workspace", () => {
    setLoadedState();

    render(<MyQueuePage />);

    expect(screen.getByText("My Queue")).toBeInTheDocument();
    expect(screen.getByText(/Queue posture/)).toBeInTheDocument();
    expect(screen.getByText("Personal triage board")).toBeInTheDocument();
    expect(screen.getByText("Current board mix")).toBeInTheDocument();
    expect(screen.getByText("Email gateway outage")).toBeInTheDocument();
    expect(screen.getByText("Laptop software refresh")).toBeInTheDocument();
    expect(screen.getByText(/Ticket INC-1042/)).toBeInTheDocument();
  });

  it("filters the board to critical work", async () => {
    setLoadedState();
    const user = userEvent.setup();

    render(<MyQueuePage />);

    await user.click(screen.getByRole("button", { name: "Focus Critical" }));

    expect(screen.getByText("Email gateway outage")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByText("Laptop software refresh"),
      ).not.toBeInTheDocument();
    });
  });

  it("reveals the quick comment composer", async () => {
    setLoadedState();
    const user = userEvent.setup();

    render(<MyQueuePage />);

    await user.click(screen.getAllByRole("button", { name: "Comment" })[0]);

    expect(screen.getByPlaceholderText("Quick comment...")).toBeInTheDocument();
    expect(screen.getByText("Public reply")).toBeInTheDocument();
  });

  it("renders the stronger empty state when the queue is clear", () => {
    setEmptyState();

    render(<MyQueuePage />);

    expect(screen.getByText("My Queue")).toBeInTheDocument();
    expect(screen.getByText("Your queue is empty")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No tickets are currently assigned to you. The queue is clear for now.",
      ),
    ).toBeInTheDocument();
  });
});
