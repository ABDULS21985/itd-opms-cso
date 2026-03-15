import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { SLAGauge } from "@/app/dashboard/itsm/tickets/[id]/page";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard/itsm/tickets/ticket-1",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: "ticket-1" }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    circle: ({ children, ...props }: any) => (
      <circle {...props}>{children}</circle>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "admin@test.com", displayName: "Admin" },
    isLoading: false,
    isLoggedIn: true,
  }),
}));

vi.mock("@/hooks/use-itsm", () => ({
  useTicket: () => ({ data: null, isLoading: true }),
  useTicketComments: () => ({ data: [], isLoading: false }),
  useSLABreaches: () => ({ data: [], isLoading: false }),
  useTicketStatusHistory: () => ({ data: [], isLoading: false }),
  useTransitionTicket: () => ({ mutateAsync: vi.fn() }),
  useUpdateTicket: () => ({ mutateAsync: vi.fn() }),
  useAddTicketComment: () => ({ mutateAsync: vi.fn() }),
  useDeleteTicketComment: () => ({ mutateAsync: vi.fn() }),
  useCreateCSATSurvey: () => ({ mutateAsync: vi.fn() }),
  useAssignTicket: () => ({ mutateAsync: vi.fn() }),
  useLinkIncidentToProblem: () => ({ mutateAsync: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns an ISO timestamp N minutes from now. */
function minutesFromNow(n: number): string {
  return new Date(Date.now() + n * 60 * 1000).toISOString();
}

/** Returns an ISO timestamp N minutes ago. */
function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 1000).toISOString();
}

/** Returns an ISO timestamp N hours from now. */
function hoursFromNow(h: number): string {
  return minutesFromNow(h * 60);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SLAGauge", () => {
  const createdAt = minutesAgo(30); // ticket created 30 mins ago

  describe("no SLA", () => {
    it("renders 'No SLA policy' when target is undefined", () => {
      render(
        <SLAGauge
          label="Resolution"
          isPaused={false}
          createdAt={createdAt}
        />,
      );
      expect(screen.getByText("No SLA policy")).toBeInTheDocument();
    });
  });

  describe("paused state", () => {
    it("renders 'Paused' when isPaused is true", () => {
      render(
        <SLAGauge
          label="Resolution"
          target={hoursFromNow(4)}
          isPaused={true}
          createdAt={createdAt}
        />,
      );
      expect(screen.getByText("Paused")).toBeInTheDocument();
    });

    it("does not render a countdown when paused", () => {
      render(
        <SLAGauge
          label="Resolution"
          target={hoursFromNow(4)}
          isPaused={true}
          createdAt={createdAt}
        />,
      );
      expect(screen.queryByText(/\d+h \d+m/)).toBeNull();
    });
  });

  describe("met state", () => {
    it("renders 'Met' when met is true", () => {
      render(
        <SLAGauge
          label="Response"
          target={hoursFromNow(2)}
          met={true}
          metAt={minutesAgo(10)}
          isPaused={false}
          createdAt={createdAt}
        />,
      );
      expect(screen.getByText("Met")).toBeInTheDocument();
    });
  });

  describe("breached state", () => {
    it("renders 'Breached' when met is false", () => {
      render(
        <SLAGauge
          label="Resolution"
          target={minutesAgo(5)}
          met={false}
          isPaused={false}
          createdAt={createdAt}
        />,
      );
      expect(screen.getByText("Breached")).toBeInTheDocument();
    });
  });

  describe("active countdown", () => {
    it("renders the label", () => {
      render(
        <SLAGauge
          label="Resolution"
          target={hoursFromNow(3)}
          isPaused={false}
          createdAt={createdAt}
        />,
      );
      expect(screen.getByText("Resolution")).toBeInTheDocument();
    });

    it("renders 'On Track' when well within deadline", () => {
      render(
        <SLAGauge
          label="Resolution"
          target={hoursFromNow(10)} // plenty of time
          isPaused={false}
          createdAt={minutesAgo(5)} // created 5 min ago
        />,
      );
      expect(screen.getByText("On Track")).toBeInTheDocument();
    });

    it("renders 'Overdue' when past deadline", () => {
      render(
        <SLAGauge
          label="Resolution"
          target={minutesAgo(10)} // target was 10 min ago — overdue
          isPaused={false}
          createdAt={minutesAgo(60)}
        />,
      );
      // "Overdue" appears twice: once in the countdown span, once in the status badge
      const overdueElements = screen.getAllByText("Overdue");
      expect(overdueElements.length).toBeGreaterThanOrEqual(1);
    });

    it("accounts for slaPausedDurationMinutes in the effective deadline", () => {
      // Target is 10 minutes from now without paused time.
      // With 60 minutes of accumulated pause, the effective deadline is 70 min from now.
      // Without the fix this would show "At Risk" or near-overdue;
      // with the fix it should still show "On Track" (plenty of time remaining).
      const baseTarget = minutesFromNow(10);
      render(
        <SLAGauge
          label="Resolution"
          target={baseTarget}
          isPaused={false}
          createdAt={minutesAgo(120)} // 2 hours old
          slaPausedDurationMinutes={60}
        />,
      );
      // Effective target = baseTarget + 60 min = ~70 min from now.
      // elapsed / total should be well under 80%, so "On Track".
      expect(screen.getByText("On Track")).toBeInTheDocument();
    });

    it("with zero slaPausedDurationMinutes behaves identically to default", () => {
      const target = hoursFromNow(8);
      const { unmount, container: c1 } = render(
        <SLAGauge
          label="Resolution"
          target={target}
          isPaused={false}
          createdAt={createdAt}
          slaPausedDurationMinutes={0}
        />,
      );
      const text0 = c1.textContent;
      unmount();

      const { container: c2 } = render(
        <SLAGauge
          label="Resolution"
          target={target}
          isPaused={false}
          createdAt={createdAt}
        />,
      );
      expect(c2.textContent).toEqual(text0);
    });
  });
});
