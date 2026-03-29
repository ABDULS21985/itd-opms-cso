import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test/test-utils";

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
  };
});

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }> & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "editor@test.com",
      displayName: "Ada Editor",
    },
    isLoading: false,
    isLoggedIn: true,
  }),
}));

const mockUseKBArticles = vi.fn();
const mockUseKBCategories = vi.fn();
const mockUseAnnouncements = vi.fn();

vi.mock("@/hooks/use-knowledge", () => ({
  useKBArticles: (...args: unknown[]) => mockUseKBArticles(...args),
  useKBCategories: (...args: unknown[]) => mockUseKBCategories(...args),
  useAnnouncements: (...args: unknown[]) => mockUseAnnouncements(...args),
}));

import KnowledgeHubPage from "../../knowledge/page";

const categories = [
  {
    id: "cat-1",
    tenantId: "tenant-1",
    name: "Operations",
    description: "Runbooks and service operations guidance.",
    sortOrder: 1,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-24T00:00:00.000Z",
  },
  {
    id: "cat-2",
    tenantId: "tenant-1",
    name: "Security",
    description: "Security practices and response references.",
    parentId: "cat-1",
    sortOrder: 2,
    createdAt: "2026-03-02T00:00:00.000Z",
    updatedAt: "2026-03-25T00:00:00.000Z",
  },
  {
    id: "cat-3",
    tenantId: "tenant-1",
    name: "Platform",
    description: "Internal platform and tooling guidance.",
    sortOrder: 3,
    createdAt: "2026-03-03T00:00:00.000Z",
    updatedAt: "2026-03-26T00:00:00.000Z",
  },
];

const recentArticles = [
  {
    id: "article-1",
    tenantId: "tenant-1",
    categoryId: "cat-1",
    title: "Major incident coordination playbook",
    slug: "major-incident-coordination-playbook",
    content:
      "Define bridge roles, communication checkpoints, and recovery owners for every major incident response.",
    status: "published",
    version: 3,
    type: "runbook",
    tags: ["incident", "ops"],
    authorId: "user-1",
    authorName: "Ada Editor",
    viewCount: 142,
    helpfulCount: 21,
    notHelpfulCount: 1,
    linkedTicketIds: [],
    publishedAt: "2026-03-27T08:00:00.000Z",
    createdAt: "2026-03-20T08:00:00.000Z",
    updatedAt: "2026-03-27T08:00:00.000Z",
  },
  {
    id: "article-2",
    tenantId: "tenant-1",
    categoryId: "cat-3",
    title: "Access review checklist for new engineers",
    slug: "access-review-checklist-for-new-engineers",
    content:
      "Use this checklist to validate baseline platform access, least privilege, and owner sign-off for new starters.",
    status: "published",
    version: 1,
    type: "guide",
    tags: ["access"],
    authorId: "user-2",
    authorName: "Jordan Reviewer",
    viewCount: 87,
    helpfulCount: 12,
    notHelpfulCount: 0,
    linkedTicketIds: [],
    publishedAt: "2026-03-26T11:00:00.000Z",
    createdAt: "2026-03-25T11:00:00.000Z",
    updatedAt: "2026-03-26T11:00:00.000Z",
  },
];

const recentAnnouncements = [
  {
    id: "announcement-1",
    tenantId: "tenant-1",
    title: "Knowledge taxonomy refresh this week",
    content:
      "Category owners should review nested lanes before Friday so the search experience stays clean.",
    priority: "medium",
    targetAudience: "all",
    targetIds: [],
    publishedAt: "2026-03-27T09:00:00.000Z",
    authorId: "user-1",
    isActive: true,
    createdAt: "2026-03-27T09:00:00.000Z",
    updatedAt: "2026-03-27T09:00:00.000Z",
  },
  {
    id: "announcement-2",
    tenantId: "tenant-1",
    title: "Runbook review deadline approaching",
    content:
      "Service owners need to update their incident runbooks before the monthly readiness audit closes.",
    priority: "high",
    targetAudience: "ops",
    targetIds: [],
    publishedAt: "2026-03-26T09:00:00.000Z",
    authorId: "user-2",
    isActive: true,
    createdAt: "2026-03-26T09:00:00.000Z",
    updatedAt: "2026-03-27T10:00:00.000Z",
  },
];

function setLoadedState() {
  mockUseKBArticles.mockImplementation(
    (_page: number, limit: number, _categoryId?: string, status?: string) => {
      if (limit === 1 && status === "published") {
        return {
          data: { data: [], meta: { totalItems: 24 } },
          isLoading: false,
        };
      }

      if (limit === 1 && status === "draft") {
        return {
          data: { data: [], meta: { totalItems: 6 } },
          isLoading: false,
        };
      }

      if (limit === 3 && status === "published") {
        return {
          data: {
            data: recentArticles,
            meta: { totalItems: recentArticles.length },
          },
          isLoading: false,
        };
      }

      return { data: undefined, isLoading: false };
    },
  );

  mockUseKBCategories.mockReturnValue({
    data: categories,
    isLoading: false,
  });

  mockUseAnnouncements.mockImplementation((_page: number, limit: number) => {
    if (limit === 1) {
      return {
        data: { data: [], meta: { totalItems: 2 } },
        isLoading: false,
      };
    }

    if (limit === 3) {
      return {
        data: {
          data: recentAnnouncements,
          meta: { totalItems: recentAnnouncements.length },
        },
        isLoading: false,
      };
    }

    return { data: undefined, isLoading: false };
  });
}

function setEmptyState() {
  mockUseKBArticles.mockReturnValue({
    data: {
      data: [],
      meta: { totalItems: 0 },
    },
    isLoading: false,
  });

  mockUseKBCategories.mockReturnValue({
    data: [],
    isLoading: false,
  });

  mockUseAnnouncements.mockReturnValue({
    data: {
      data: [],
      meta: { totalItems: 0 },
    },
    isLoading: false,
  });
}

describe("KnowledgeHubPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the upgraded editorial workspace", () => {
    setLoadedState();

    render(<KnowledgeHubPage />);

    expect(screen.getByText("Knowledge Management")).toBeInTheDocument();
    expect(screen.getAllByText(/Ada Editor/).length).toBeGreaterThan(0);
    expect(screen.getByText("Knowledge pulse")).toBeInTheDocument();
    expect(
      screen.getByText("Fresh knowledge shipping now"),
    ).toBeInTheDocument();
    expect(screen.getByText("Active announcements")).toBeInTheDocument();
    expect(screen.getByText("Category coverage")).toBeInTheDocument();
    expect(screen.getByText("Knowledge modules")).toBeInTheDocument();
  });

  it("renders live article, announcement, and taxonomy data", () => {
    setLoadedState();

    render(<KnowledgeHubPage />);

    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);

    expect(
      screen.getByText("Major incident coordination playbook"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Knowledge taxonomy refresh this week"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Platform").length).toBeGreaterThan(0);
    expect(screen.getByText("Article studio")).toBeInTheDocument();
    expect(screen.getByText("Broadcast center")).toBeInTheDocument();
  });

  it("renders the stronger empty states when knowledge content is missing", () => {
    setEmptyState();

    render(<KnowledgeHubPage />);

    expect(screen.getByText("Knowledge Management")).toBeInTheDocument();
    expect(screen.getByText("No published knowledge yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Publish your first article to start building a searchable knowledge library/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/No active announcements yet/)).toBeInTheDocument();
    expect(screen.getByText(/No categories created yet/)).toBeInTheDocument();
  });
});
