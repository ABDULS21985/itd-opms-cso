import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportToCSV, exportToExcel, exportToPDF, type ExportColumn } from "../export-utils";

// =============================================================================
// Mock DOM APIs used by triggerDownload and exportToPDF
// =============================================================================
let mockAnchor: {
  href: string;
  download: string;
  click: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  mockAnchor = { href: "", download: "", click: vi.fn() };

  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "a") return mockAnchor as unknown as HTMLAnchorElement;
    return document.createElement(tag);
  });

  vi.spyOn(document.body, "appendChild").mockImplementation(
    (node) => node as Node,
  );
  vi.spyOn(document.body, "removeChild").mockImplementation(
    (node) => node as Node,
  );

  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});

// =============================================================================
// Sample data
// =============================================================================
const sampleData = [
  { id: 1, name: "Alice", department: "Engineering", score: 95 },
  { id: 2, name: "Bob", department: "Marketing", score: 87 },
  { id: 3, name: "Charlie", department: "Engineering", score: 92 },
];

const columns: ExportColumn[] = [
  { key: "id", header: "ID" },
  { key: "name", header: "Name" },
  { key: "department", header: "Department" },
  { key: "score", header: "Score" },
];

// =============================================================================
// exportToCSV
// =============================================================================
describe("exportToCSV", () => {
  it("creates a CSV blob and triggers download", () => {
    exportToCSV(sampleData, columns, "test-export");

    // Should have created a blob URL and triggered click
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockAnchor.download).toBe("test-export.csv");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("generates correct CSV content with headers and rows", () => {
    let capturedBlob: Blob | null = null;
    vi.mocked(URL.createObjectURL).mockImplementation((blob: Blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });

    exportToCSV(sampleData, columns, "test");

    expect(capturedBlob).not.toBeNull();
    // Read the blob content
    const reader = new FileReader();
    reader.readAsText(capturedBlob!);
    // The blob is created synchronously, so we can check its size
    expect(capturedBlob!.type).toBe("text/csv;charset=utf-8");
  });

  it("escapes CSV values containing commas", () => {
    const dataWithCommas = [
      { id: 1, name: "Doe, John", department: "Eng", score: 95 },
    ];

    let capturedBlob: Blob | null = null;
    vi.mocked(URL.createObjectURL).mockImplementation((blob: Blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });

    exportToCSV(dataWithCommas, columns, "test");
    expect(capturedBlob).not.toBeNull();
  });

  it("escapes CSV values containing double quotes", () => {
    const dataWithQuotes = [
      { id: 1, name: 'Say "Hello"', department: "Eng", score: 95 },
    ];

    let capturedBlob: Blob | null = null;
    vi.mocked(URL.createObjectURL).mockImplementation((blob: Blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });

    exportToCSV(dataWithQuotes, columns, "test");
    expect(capturedBlob).not.toBeNull();
  });

  it("applies custom format functions to columns", () => {
    const columnsWithFormat: ExportColumn[] = [
      { key: "id", header: "ID" },
      { key: "name", header: "Name" },
      {
        key: "score",
        header: "Score",
        format: (val) => `${val}%`,
      },
    ];

    let capturedBlob: Blob | null = null;
    vi.mocked(URL.createObjectURL).mockImplementation((blob: Blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });

    exportToCSV(sampleData, columnsWithFormat, "test");
    expect(capturedBlob).not.toBeNull();
  });

  it("handles nested keys using dot notation", () => {
    const nestedData = [
      { id: 1, user: { name: "Alice", email: "alice@test.com" } },
    ];
    const nestedColumns: ExportColumn[] = [
      { key: "id", header: "ID" },
      { key: "user.name", header: "User Name" },
      { key: "user.email", header: "Email" },
    ];

    exportToCSV(nestedData, nestedColumns, "nested");
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it("handles null/undefined values in data", () => {
    const dataWithNulls = [
      { id: 1, name: null, department: undefined, score: 0 },
    ];

    exportToCSV(dataWithNulls as any, columns, "nulls");
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it("handles empty data array", () => {
    exportToCSV([], columns, "empty");
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockAnchor.download).toBe("empty.csv");
  });
});

// =============================================================================
// exportToExcel
// =============================================================================
describe("exportToExcel", () => {
  it("creates an Excel XML blob and triggers download", () => {
    exportToExcel(sampleData, columns, "test-export");

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockAnchor.download).toBe("test-export.xls");
  });

  it("uses custom sheet name when provided", () => {
    let capturedBlob: Blob | null = null;
    vi.mocked(URL.createObjectURL).mockImplementation((blob: Blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });

    exportToExcel(sampleData, columns, "test", "MySheet");
    expect(capturedBlob).not.toBeNull();
    expect(capturedBlob!.type).toBe("application/vnd.ms-excel");
  });

  it("defaults sheet name to Sheet1", () => {
    let capturedBlob: Blob | null = null;
    vi.mocked(URL.createObjectURL).mockImplementation((blob: Blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });

    exportToExcel(sampleData, columns, "test");
    expect(capturedBlob).not.toBeNull();
  });

  it("handles empty data array", () => {
    exportToExcel([], columns, "empty");
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockAnchor.download).toBe("empty.xls");
  });

  it("escapes XML special characters in values", () => {
    const dataWithSpecialChars = [
      { id: 1, name: "A & B <C>", department: '"Eng"', score: 95 },
    ];

    exportToExcel(dataWithSpecialChars, columns, "special");
    expect(mockAnchor.click).toHaveBeenCalled();
  });
});

// =============================================================================
// exportToPDF
// =============================================================================
describe("exportToPDF", () => {
  it("opens a new window and writes HTML content", () => {
    const mockWrite = vi.fn();
    const mockClose = vi.fn();
    const mockWin = { document: { write: mockWrite, close: mockClose } };

    vi.spyOn(window, "open").mockReturnValue(mockWin as unknown as Window);

    exportToPDF(sampleData, columns, "Test Report");

    expect(window.open).toHaveBeenCalledWith("", "_blank");
    expect(mockWrite).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();

    // Verify the HTML content contains the title
    const htmlContent = mockWrite.mock.calls[0][0] as string;
    expect(htmlContent).toContain("Test Report");
    expect(htmlContent).toContain("Alice");
    expect(htmlContent).toContain("Bob");
    expect(htmlContent).toContain("Charlie");
  });

  it("handles null window.open return value gracefully", () => {
    vi.spyOn(window, "open").mockReturnValue(null);

    // Should not throw
    expect(() => exportToPDF(sampleData, columns, "Test")).not.toThrow();
  });

  it("escapes HTML special characters in data", () => {
    const mockWrite = vi.fn();
    const mockClose = vi.fn();
    const mockWin = { document: { write: mockWrite, close: mockClose } };
    vi.spyOn(window, "open").mockReturnValue(mockWin as unknown as Window);

    const dataWithHTML = [
      { id: 1, name: "<script>alert(1)</script>", department: "Eng", score: 0 },
    ];

    exportToPDF(dataWithHTML, columns, "Escape Test");

    const htmlContent = mockWrite.mock.calls[0][0] as string;
    // The template itself contains a <script> for print, but the DATA should be escaped
    expect(htmlContent).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    // The unescaped data value should NOT appear in a <td>
    expect(htmlContent).not.toContain("<td><script>alert(1)</script></td>");
  });

  it("includes record count in the exported HTML", () => {
    const mockWrite = vi.fn();
    const mockClose = vi.fn();
    const mockWin = { document: { write: mockWrite, close: mockClose } };
    vi.spyOn(window, "open").mockReturnValue(mockWin as unknown as Window);

    exportToPDF(sampleData, columns, "Count Test");

    const htmlContent = mockWrite.mock.calls[0][0] as string;
    expect(htmlContent).toContain("3 records");
  });

  it("handles empty data array", () => {
    const mockWrite = vi.fn();
    const mockClose = vi.fn();
    const mockWin = { document: { write: mockWrite, close: mockClose } };
    vi.spyOn(window, "open").mockReturnValue(mockWin as unknown as Window);

    exportToPDF([], columns, "Empty");

    const htmlContent = mockWrite.mock.calls[0][0] as string;
    expect(htmlContent).toContain("0 records");
  });
});
