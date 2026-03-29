import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/test/test-utils";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

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
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
  };
});

const mockUseAccessReviewCampaigns = vi.fn();
const mockUseAccessReviewEntries = vi.fn();
const mockUseRecordAccessReviewDecision = vi.fn();
const mockDecisionMutate = vi.fn();

vi.mock("@/hooks/use-grc", () => ({
  useAccessReviewCampaigns: (...args: unknown[]) =>
    mockUseAccessReviewCampaigns(...args),
  useAccessReviewEntries: (...args: unknown[]) =>
    mockUseAccessReviewEntries(...args),
  useRecordAccessReviewDecision: (...args: unknown[]) =>
    mockUseRecordAccessReviewDecision(...args),
}));

import AccessReviewsPage from "../access-reviews/page";

const campaigns = [
  {
    id: "campaign-1",
    tenantId: "tenant-1",
    title: "Q1 privileged access certification",
    scope: "Core banking and infrastructure admin roles.",
    status: "active",
    reviewerIds: ["rev-1", "rev-2"],
    dueDate: "2026-04-02T00:00:00Z",
    completionRate: 62,
    createdBy: "user-1",
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-22T00:00:00Z",
  },
  {
    id: "campaign-2",
    tenantId: "tenant-1",
    title: "Finance role recertification",
    scope: "Treasury and finance entitlements.",
    status: "review",
    reviewerIds: ["rev-3"],
    dueDate: "2026-04-05T00:00:00Z",
    completionRate: 84,
    createdBy: "user-2",
    createdAt: "2026-03-04T00:00:00Z",
    updatedAt: "2026-03-24T00:00:00Z",
  },
  {
    id: "campaign-3",
    tenantId: "tenant-1",
    title: "Dormant access cleanup",
    scope: "Clean up inactive employee entitlements.",
    status: "completed",
    reviewerIds: ["rev-4"],
    dueDate: "2026-03-18T00:00:00Z",
    completionRate: 100,
    createdBy: "user-3",
    createdAt: "2026-02-20T00:00:00Z",
    updatedAt: "2026-03-18T00:00:00Z",
  },
];

const entriesByCampaign = {
  "campaign-1": [
    {
      id: "entry-1",
      campaignId: "campaign-1",
      tenantId: "tenant-1",
      userId: "user-alpha-123456",
      roleId: "role-admin-987654",
      reviewerId: "rev-1",
      decision: undefined,
      createdAt: "2026-03-26T00:00:00Z",
    },
    {
      id: "entry-2",
      campaignId: "campaign-1",
      tenantId: "tenant-1",
      userId: "user-beta-123456",
      roleId: "role-audit-111111",
      reviewerId: "rev-2",
      decision: "approved",
      decidedAt: "2026-03-27T00:00:00Z",
      createdAt: "2026-03-26T00:00:00Z",
    },
  ],
  "campaign-2": [],
  "campaign-3": [],
} as const;

function setLoadedState() {
  mockUseAccessReviewCampaigns.mockImplementation(
    (_page: number, _limit: number, status?: string) => {
      const filtered = status
        ? campaigns.filter((campaign) => campaign.status === status)
        : campaigns;

      return {
        data: {
          data: filtered,
          meta: {
            page: 1,
            pageSize: 20,
            totalItems: filtered.length,
            totalPages: 1,
          },
        },
        isLoading: false,
      };
    },
  );

  mockUseAccessReviewEntries.mockImplementation((campaignId?: string) => ({
    data: entriesByCampaign[campaignId as keyof typeof entriesByCampaign] ?? [],
    isLoading: false,
  }));

  mockUseRecordAccessReviewDecision.mockReturnValue({
    mutate: mockDecisionMutate,
    isPending: false,
  });
}

function setEmptyState() {
  mockUseAccessReviewCampaigns.mockReturnValue({
    data: {
      data: [],
      meta: {
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
      },
    },
    isLoading: false,
  });

  mockUseAccessReviewEntries.mockReturnValue({
    data: [],
    isLoading: false,
  });

  mockUseRecordAccessReviewDecision.mockReturnValue({
    mutate: mockDecisionMutate,
    isPending: false,
  });
}

describe("AccessReviewsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setLoadedState();
  });

  it("renders the upgraded access review workspace", () => {
    render(<AccessReviewsPage />);

    expect(screen.getByText("Access Reviews")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Entitlement certification, reviewer throughput, and decision pressure/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Review pulse")).toBeInTheDocument();
    expect(screen.getByText("Certification lanes")).toBeInTheDocument();
    expect(screen.getByText("Live certification board")).toBeInTheDocument();
    expect(screen.getByText("Current board state")).toBeInTheDocument();
    expect(
      screen.getAllByText("Q1 privileged access certification").length,
    ).toBeGreaterThan(0);
  });

  it("reveals review filters and narrows the board by status", async () => {
    const user = userEvent.setup();

    render(<AccessReviewsPage />);

    await user.click(screen.getByRole("button", { name: "Review filters" }));
    await user.selectOptions(
      screen.getByLabelText("Campaign status"),
      "completed",
    );

    expect(
      screen.getAllByText("Dormant access cleanup").length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryAllByText("Q1 privileged access certification"),
    ).toHaveLength(0);
  });

  it("expands a campaign and records a decision from the review ledger", async () => {
    const user = userEvent.setup();

    render(<AccessReviewsPage />);

    await user.click(
      screen.getByRole("button", {
        name: /Open review ledger for Q1 privileged access certification/,
      }),
    );

    expect(screen.getByText("Decision queue")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Approve user-alpha-123456/ }),
    );

    expect(mockDecisionMutate).toHaveBeenCalledWith({
      entryId: "entry-1",
      decision: "approved",
    });
  });

  it("renders the stronger empty state when no campaigns exist", async () => {
    const user = userEvent.setup();
    setEmptyState();

    render(<AccessReviewsPage />);

    expect(
      screen.getByText("No access review campaigns yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Start a certification cycle to review user entitlements/,
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Launch first access review campaign",
      }),
    );

    expect(mockPush).toHaveBeenCalledWith(
      "/dashboard/grc/access-reviews?action=new",
    );
  });
});
