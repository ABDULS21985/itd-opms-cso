import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/test/test-utils";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockUseCatalogCategories = vi.fn();
const mockUseEntitledCatalogItems = vi.fn();
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockUseQueryClient = vi.fn();
const mockToggleFavoriteMutate = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(""),
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

vi.mock("@/hooks/use-itsm", () => ({
  useCatalogCategories: (...args: unknown[]) =>
    mockUseCatalogCategories(...args),
  useEntitledCatalogItems: (...args: unknown[]) =>
    mockUseEntitledCatalogItems(...args),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );

  return {
    ...actual,
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
    useMutation: (...args: unknown[]) => mockUseMutation(...args),
    useQueryClient: (...args: unknown[]) => mockUseQueryClient(...args),
  };
});

import ServiceCatalogPage from "../service-catalog/page";

const categories = [
  {
    id: "cat-hardware",
    tenantId: "tenant-1",
    name: "Hardware",
    description: "Devices and endpoints",
    sortOrder: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "cat-access",
    tenantId: "tenant-1",
    name: "Access",
    description: "Identity and access services",
    sortOrder: 2,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "cat-collab",
    tenantId: "tenant-1",
    name: "Collaboration",
    description: "Meeting and collaboration services",
    sortOrder: 3,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

const entitledItems = [
  {
    id: "svc-1",
    tenantId: "tenant-1",
    categoryId: "cat-hardware",
    name: "Laptop Provisioning",
    description: "Request a new managed laptop for a staff member.",
    approvalRequired: true,
    entitlementRoles: [],
    estimatedDelivery: "2 business days",
    status: "active",
    version: 1,
    createdAt: "2026-03-20T00:00:00Z",
    updatedAt: "2026-03-24T00:00:00Z",
  },
  {
    id: "svc-2",
    tenantId: "tenant-1",
    categoryId: "cat-access",
    name: "VPN Access",
    description: "Grant secure remote network access.",
    approvalRequired: true,
    entitlementRoles: [],
    estimatedDelivery: "1 business day",
    status: "active",
    version: 1,
    createdAt: "2026-03-22T00:00:00Z",
    updatedAt: "2026-03-25T00:00:00Z",
  },
  {
    id: "svc-3",
    tenantId: "tenant-1",
    categoryId: "cat-collab",
    name: "Conference Room Support",
    description: "Book AV and room-side technical support for meetings.",
    approvalRequired: false,
    entitlementRoles: [],
    estimatedDelivery: "Same day",
    status: "active",
    version: 1,
    createdAt: "2026-03-18T00:00:00Z",
    updatedAt: "2026-03-26T00:00:00Z",
  },
];

const marketplaceItems = [
  ...entitledItems,
  {
    id: "svc-4",
    tenantId: "tenant-1",
    categoryId: "cat-access",
    name: "Privileged Access Bundle",
    description: "Expanded administrative access package.",
    approvalRequired: true,
    entitlementRoles: [],
    estimatedDelivery: "3 business days",
    status: "active",
    version: 1,
    createdAt: "2026-03-15T00:00:00Z",
    updatedAt: "2026-03-26T00:00:00Z",
  },
];

function searchItems(term: string) {
  const query = term.toLowerCase();
  return marketplaceItems.filter(
    (item) =>
      item.name.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query),
  );
}

function setLoadedState() {
  mockUseCatalogCategories.mockReturnValue({
    data: categories,
    isLoading: false,
  });

  mockUseEntitledCatalogItems.mockReturnValue({
    data: entitledItems,
    isLoading: false,
  });

  mockUseQuery.mockImplementation(
    ({ queryKey, enabled }: { queryKey: unknown[]; enabled?: boolean }) => {
      const key = queryKey[0];

      if (key === "catalog-marketplace") {
        return enabled
          ? {
              data: {
                data: marketplaceItems,
                meta: {
                  page: 1,
                  pageSize: 150,
                  totalItems: marketplaceItems.length,
                  totalPages: 1,
                },
              },
              isLoading: false,
            }
          : { data: undefined, isLoading: false };
      }

      if (key === "catalog-search") {
        if (enabled === false) {
          return { data: undefined, isLoading: false };
        }

        return {
          data: searchItems(String(queryKey[1] || "")),
          isLoading: false,
        };
      }

      if (key === "catalog-favorites") {
        return { data: ["svc-1"], isLoading: false };
      }

      if (key === "catalog-popular") {
        return { data: [entitledItems[0], entitledItems[1]], isLoading: false };
      }

      if (key === "catalog-recent") {
        return { data: [entitledItems[1]], isLoading: false };
      }

      return { data: undefined, isLoading: false };
    },
  );

  mockUseMutation.mockReturnValue({
    mutate: mockToggleFavoriteMutate,
    isPending: false,
  });

  mockUseQueryClient.mockReturnValue({
    cancelQueries: vi.fn().mockResolvedValue(undefined),
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  });
}

function setEmptyState() {
  mockUseCatalogCategories.mockReturnValue({
    data: [],
    isLoading: false,
  });

  mockUseEntitledCatalogItems.mockReturnValue({
    data: [],
    isLoading: false,
  });

  mockUseQuery.mockImplementation(
    ({ queryKey, enabled }: { queryKey: unknown[]; enabled?: boolean }) => {
      const key = queryKey[0];

      if (key === "catalog-marketplace") {
        return enabled
          ? {
              data: {
                data: [],
                meta: { page: 1, pageSize: 150, totalItems: 0, totalPages: 0 },
              },
              isLoading: false,
            }
          : { data: undefined, isLoading: false };
      }

      if (key === "catalog-search") {
        return enabled
          ? { data: [], isLoading: false }
          : { data: undefined, isLoading: false };
      }

      if (
        key === "catalog-favorites" ||
        key === "catalog-popular" ||
        key === "catalog-recent"
      ) {
        return { data: [], isLoading: false };
      }

      return { data: undefined, isLoading: false };
    },
  );

  mockUseMutation.mockReturnValue({
    mutate: mockToggleFavoriteMutate,
    isPending: false,
  });

  mockUseQueryClient.mockReturnValue({
    cancelQueries: vi.fn().mockResolvedValue(undefined),
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  });
}

describe("ServiceCatalogPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    setLoadedState();
  });

  it("renders the upgraded service catalog workspace", () => {
    render(<ServiceCatalogPage />);

    expect(screen.getByText("Service Catalog")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Browse fulfillment-ready IT services, focus the board with quick lenses/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Catalog pulse")).toBeInTheDocument();
    expect(screen.getByText("Focus lanes")).toBeInTheDocument();
    expect(screen.getByText("Search console")).toBeInTheDocument();
    expect(screen.getByText("Live service board")).toBeInTheDocument();
    expect(screen.getByText("Current lens")).toBeInTheDocument();
    expect(screen.getByText("Conference Room Support")).toBeInTheDocument();
  });

  it("switches into a category lane and narrows the board", async () => {
    const user = userEvent.setup();

    render(<ServiceCatalogPage />);

    await user.click(
      screen.getByRole("button", { name: "Focus lane Hardware" }),
    );

    expect(screen.getByText("Hardware services")).toBeInTheDocument();
    expect(screen.getAllByText("Laptop Provisioning").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.queryByText("Conference Room Support"),
    ).not.toBeInTheDocument();
  });

  it("records favorite toggles from the upgraded service cards", async () => {
    const user = userEvent.setup();

    render(<ServiceCatalogPage />);

    await user.click(
      screen.getByRole("button", {
        name: "Toggle favorite for Conference Room Support",
      }),
    );

    expect(mockToggleFavoriteMutate).toHaveBeenCalledWith("svc-3");
  });

  it("renders the stronger empty state when no services are available", () => {
    setEmptyState();

    render(<ServiceCatalogPage />);

    expect(screen.getByText("Service Catalog")).toBeInTheDocument();
    expect(
      screen.getByText("No services available in this board"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The current lens does not expose any services. Adjust the filters or wait for the catalog to be populated.",
      ),
    ).toBeInTheDocument();
  });
});
