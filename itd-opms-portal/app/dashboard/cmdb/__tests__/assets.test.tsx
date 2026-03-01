import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";

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
  usePathname: () => "/dashboard/cmdb/assets",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const {
        initial, animate, exit, transition, whileHover, whileTap,
        whileFocus, layout, layoutId, variants, ...rest
      } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock sonner
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

// Mock DataTable to simplify testing
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
            <tr key={item.id} data-testid={`asset-row-${item.id}`}>
              <td>{item.assetTag}</td>
              <td>{item.name}</td>
              <td>{item.type}</td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
}));

// ---------------------------------------------------------------------------
// CMDB hook mocks
// ---------------------------------------------------------------------------

const mockUseAssets = vi.fn();
const mockUseAssetStats = vi.fn();

vi.mock("@/hooks/use-cmdb", () => ({
  useAssets: (...args: any[]) => mockUseAssets(...args),
  useAssetStats: (...args: any[]) => mockUseAssetStats(...args),
}));

// ---------------------------------------------------------------------------
// Import component under test AFTER mocks
// ---------------------------------------------------------------------------

import AssetsPage from "../assets/page";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AssetsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page heading and description", () => {
    mockUseAssets.mockReturnValue({ data: undefined, isLoading: true });
    mockUseAssetStats.mockReturnValue({ data: undefined });

    render(<AssetsPage />);

    expect(screen.getByText("Assets")).toBeInTheDocument();
    expect(
      screen.getByText("View and manage hardware, software, and cloud assets"),
    ).toBeInTheDocument();
  });

  it("renders Register Asset button", () => {
    mockUseAssets.mockReturnValue({ data: undefined, isLoading: true });
    mockUseAssetStats.mockReturnValue({ data: undefined });

    render(<AssetsPage />);

    expect(screen.getByText("Register Asset")).toBeInTheDocument();
  });

  it("renders Filters button", () => {
    mockUseAssets.mockReturnValue({ data: undefined, isLoading: true });
    mockUseAssetStats.mockReturnValue({ data: undefined });

    render(<AssetsPage />);

    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("shows loading state when assets are being fetched", () => {
    mockUseAssets.mockReturnValue({ data: undefined, isLoading: true });
    mockUseAssetStats.mockReturnValue({ data: undefined });

    render(<AssetsPage />);

    expect(screen.getByTestId("data-table-loading")).toBeInTheDocument();
  });

  it("shows empty state when there are no assets", () => {
    mockUseAssets.mockReturnValue({
      data: { data: [], meta: { page: 1, totalPages: 1, totalItems: 0, pageSize: 20 } },
      isLoading: false,
    });
    mockUseAssetStats.mockReturnValue({ data: undefined });

    render(<AssetsPage />);

    expect(screen.getByTestId("data-table-empty")).toBeInTheDocument();
    expect(screen.getByText("No assets found")).toBeInTheDocument();
    expect(
      screen.getByText("Register your first asset to get started."),
    ).toBeInTheDocument();
  });

  it("renders asset list when data is available", () => {
    const mockAssets = [
      {
        id: "a-1",
        assetTag: "AST-001",
        name: "Dell PowerEdge R740",
        type: "hardware",
        status: "active",
        location: "DC-1",
        building: null,
        ownerId: "user-1",
        purchaseDate: "2024-03-15",
      },
      {
        id: "a-2",
        assetTag: "AST-002",
        name: "Microsoft 365 E5",
        type: "software",
        status: "active",
        location: null,
        building: null,
        ownerId: null,
        purchaseDate: "2024-06-01",
      },
      {
        id: "a-3",
        assetTag: "AST-003",
        name: "Cisco Catalyst 9300",
        type: "network",
        status: "maintenance",
        location: "Floor 2",
        building: null,
        ownerId: "user-2",
        purchaseDate: null,
      },
    ];

    mockUseAssets.mockReturnValue({
      data: {
        data: mockAssets,
        meta: { page: 1, totalPages: 1, totalItems: 3, pageSize: 20 },
      },
      isLoading: false,
    });
    mockUseAssetStats.mockReturnValue({ data: undefined });

    render(<AssetsPage />);

    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.getByTestId("asset-row-a-1")).toBeInTheDocument();
    expect(screen.getByTestId("asset-row-a-2")).toBeInTheDocument();
    expect(screen.getByTestId("asset-row-a-3")).toBeInTheDocument();
    expect(screen.getByText("AST-001")).toBeInTheDocument();
    expect(screen.getByText("Dell PowerEdge R740")).toBeInTheDocument();
    expect(screen.getByText("AST-002")).toBeInTheDocument();
    expect(screen.getByText("AST-003")).toBeInTheDocument();
  });

  it("renders asset stats when stats data is available", () => {
    mockUseAssets.mockReturnValue({
      data: { data: [], meta: { page: 1, totalPages: 1, totalItems: 0, pageSize: 20 } },
      isLoading: false,
    });
    mockUseAssetStats.mockReturnValue({
      data: {
        total: 250,
        activeCount: 180,
        maintenanceCount: 15,
        retiredCount: 55,
      },
    });

    render(<AssetsPage />);

    expect(screen.getByText("Total Assets")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("180")).toBeInTheDocument();
    expect(screen.getByText("Maintenance")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("Retired")).toBeInTheDocument();
    expect(screen.getByText("55")).toBeInTheDocument();
  });

  it("does not render stats cards when stats data is unavailable", () => {
    mockUseAssets.mockReturnValue({ data: undefined, isLoading: true });
    mockUseAssetStats.mockReturnValue({ data: undefined });

    render(<AssetsPage />);

    expect(screen.queryByText("Total Assets")).not.toBeInTheDocument();
  });

  it("renders table column headers", () => {
    const mockAssets = [
      {
        id: "a-1",
        assetTag: "AST-001",
        name: "Test Server",
        type: "hardware",
        status: "active",
        location: "DC-1",
        building: null,
        ownerId: null,
        purchaseDate: null,
      },
    ];

    mockUseAssets.mockReturnValue({
      data: {
        data: mockAssets,
        meta: { page: 1, totalPages: 1, totalItems: 1, pageSize: 20 },
      },
      isLoading: false,
    });
    mockUseAssetStats.mockReturnValue({ data: undefined });

    render(<AssetsPage />);

    expect(screen.getByText("Asset Tag")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Purchase Date")).toBeInTheDocument();
  });
});
