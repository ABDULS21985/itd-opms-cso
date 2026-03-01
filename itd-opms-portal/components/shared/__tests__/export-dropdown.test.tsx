import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent } from "@/test/test-utils";
import { ExportDropdown } from "../export-dropdown";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

const mockExportToCSV = vi.fn();
const mockExportToExcel = vi.fn();
const mockExportToPDF = vi.fn();

vi.mock("@/lib/export-utils", () => ({
  exportToCSV: (...args: any[]) => mockExportToCSV(...args),
  exportToExcel: (...args: any[]) => mockExportToExcel(...args),
  exportToPDF: (...args: any[]) => mockExportToPDF(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ExportDropdown", () => {
  const testData = [
    { id: "1", name: "Alpha" },
    { id: "2", name: "Bravo" },
  ];

  const columns = [
    { key: "id", header: "ID" },
    { key: "name", header: "Name" },
  ];

  const defaultProps = {
    data: testData,
    columns,
    filename: "test-export",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the export button", () => {
    render(<ExportDropdown {...defaultProps} />);
    expect(screen.getByText("Export")).toBeInTheDocument();
  });

  it("opens dropdown when export button is clicked", async () => {
    const user = userEvent.setup();
    render(<ExportDropdown {...defaultProps} />);

    await user.click(screen.getByText("Export"));

    expect(screen.getByText("Export as CSV")).toBeInTheDocument();
    expect(screen.getByText("Export as Excel")).toBeInTheDocument();
    expect(screen.getByText("Export as PDF")).toBeInTheDocument();
  });

  it("calls exportToCSV when CSV option is clicked", async () => {
    const user = userEvent.setup();
    render(<ExportDropdown {...defaultProps} />);

    await user.click(screen.getByText("Export"));
    await user.click(screen.getByText("Export as CSV"));

    expect(mockExportToCSV).toHaveBeenCalledWith(
      testData,
      columns,
      "test-export",
    );
  });

  it("calls exportToExcel when Excel option is clicked", async () => {
    const user = userEvent.setup();
    render(<ExportDropdown {...defaultProps} />);

    await user.click(screen.getByText("Export"));
    await user.click(screen.getByText("Export as Excel"));

    expect(mockExportToExcel).toHaveBeenCalledWith(
      testData,
      columns,
      "test-export",
    );
  });

  it("calls exportToPDF when PDF option is clicked", async () => {
    const user = userEvent.setup();
    render(<ExportDropdown {...defaultProps} />);

    await user.click(screen.getByText("Export"));
    await user.click(screen.getByText("Export as PDF"));

    expect(mockExportToPDF).toHaveBeenCalledWith(
      testData,
      columns,
      "test-export",
    );
  });

  it("closes dropdown after clicking an export option", async () => {
    const user = userEvent.setup();
    render(<ExportDropdown {...defaultProps} />);

    await user.click(screen.getByText("Export"));
    await user.click(screen.getByText("Export as CSV"));

    // After clicking, dropdown should close
    expect(screen.queryByText("Export as CSV")).not.toBeInTheDocument();
  });

  it("shows server export option when serverExportUrl is provided", async () => {
    const user = userEvent.setup();
    render(
      <ExportDropdown
        {...defaultProps}
        serverExportUrl="/api/export/tickets"
      />,
    );

    await user.click(screen.getByText("Export"));
    expect(screen.getByText("Export All (CSV)")).toBeInTheDocument();
  });

  it("does not show server export option when serverExportUrl is not provided", async () => {
    const user = userEvent.setup();
    render(<ExportDropdown {...defaultProps} />);

    await user.click(screen.getByText("Export"));
    expect(screen.queryByText("Export All (CSV)")).not.toBeInTheDocument();
  });
});
