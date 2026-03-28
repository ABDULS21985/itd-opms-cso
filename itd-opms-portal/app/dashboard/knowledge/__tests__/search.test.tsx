import { act, render, screen, userEvent, waitFor } from "@/test/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const mockUseSearchKBArticles = vi.fn();
const mockUseKBCategories = vi.fn();

vi.mock("@/hooks/use-knowledge", () => ({
  useSearchKBArticles: (...args: unknown[]) => mockUseSearchKBArticles(...args),
  useKBCategories: (...args: unknown[]) => mockUseKBCategories(...args),
}));

import KnowledgeSearchPage from "../../knowledge/search/page";

const categories = [
  {
    id: "cat-1",
    tenantId: "tenant-1",
    name: "Operations",
    description: "Runbooks and operational guidance.",
    sortOrder: 1,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-27T00:00:00.000Z",
  },
  {
    id: "cat-2",
    tenantId: "tenant-1",
    name: "Security",
    description: "Security practices and access guidance.",
    parentId: "cat-1",
    sortOrder: 2,
    createdAt: "2026-03-02T00:00:00.000Z",
    updatedAt: "2026-03-26T00:00:00.000Z",
  },
];

function setCategoryMock() {
  mockUseKBCategories.mockReturnValue({
    data: categories,
    isLoading: false,
  });
}

describe("KnowledgeSearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCategoryMock();
    mockUseSearchKBArticles.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
    });
  });

  it("renders the upgraded search workspace", () => {
    render(<KnowledgeSearchPage />);

    expect(screen.getByText("Search Knowledge Base")).toBeInTheDocument();
    expect(screen.getByText("Discovery pulse")).toBeInTheDocument();
    expect(screen.getByText("Search without guesswork")).toBeInTheDocument();
    expect(screen.getByText("Back to Knowledge Hub")).toBeInTheDocument();
    expect(screen.getByText("Browse by category")).toBeInTheDocument();
  });

  it("shows the stronger initial state and taxonomy lanes before searching", () => {
    render(<KnowledgeSearchPage />);

    expect(screen.getByText("Search the Knowledge Base")).toBeInTheDocument();
    expect(
      screen.getByText(/Start with a question, service name, or known tag/),
    ).toBeInTheDocument();
    expect(screen.getByText("Operations")).toBeInTheDocument();
    expect(screen.getAllByText("Security").length).toBeGreaterThan(0);
  });

  it("displays rich search results after typing and debounce", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    mockUseSearchKBArticles.mockImplementation((query: string) => {
      if (query && query.length > 0) {
        return {
          data: {
            data: [
              {
                id: "art-1",
                title: "Remote access VPN guide",
                slug: "remote-access-vpn-guide",
                content:
                  "This guide explains how to configure remote access VPN and verify endpoint trust before connecting.",
                type: "how_to",
                status: "published",
                categoryId: "cat-2",
                publishedAt: "2026-03-20T10:00:00Z",
                viewCount: 150,
                tags: ["vpn", "remote-access", "security"],
              },
            ],
            meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
          },
          isLoading: false,
          isFetching: false,
        };
      }

      return { data: undefined, isLoading: false, isFetching: false };
    });

    render(<KnowledgeSearchPage />);

    const input = screen.getByPlaceholderText(
      "Search by title, body copy, or knowledge tags...",
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await user.type(input, "VPN");

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText("Remote access VPN guide")).toBeInTheDocument();
    });

    expect(screen.getByText("Results found")).toBeInTheDocument();
    expect(screen.getByText("150 views")).toBeInTheDocument();
    expect(screen.getAllByText("Security").length).toBeGreaterThan(0);
    expect(screen.getAllByText("vpn").length).toBeGreaterThan(0);

    vi.useRealTimers();
  }, 15000);

  it("shows the stronger empty state when nothing matches", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    mockUseSearchKBArticles.mockImplementation((query: string) => {
      if (query && query.length > 0) {
        return {
          data: {
            data: [],
            meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
          },
          isLoading: false,
          isFetching: false,
        };
      }

      return { data: undefined, isLoading: false, isFetching: false };
    });

    render(<KnowledgeSearchPage />);

    const input = screen.getByPlaceholderText(
      "Search by title, body copy, or knowledge tags...",
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await user.type(input, "nonexistent");

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText("No results found")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Try broader terms, category names, or one of the discovery prompts below./),
    ).toBeInTheDocument();

    vi.useRealTimers();
  }, 15000);
});
