import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent, fireEvent } from "@/test/test-utils";
import { DocumentUpload } from "../document-upload";

// ---------------------------------------------------------------------------
// Mock framer-motion
// ---------------------------------------------------------------------------
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({ children, animate: _a, initial: _i, exit: _e, transition: _t, ...rest }: any) => (
      <div {...rest}>{children}</div>
    ),
  },
}));

describe("DocumentUpload", () => {
  const defaultProps = {
    onUpload: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the drop zone with instructions", () => {
    render(<DocumentUpload {...defaultProps} />);
    expect(screen.getByText("Drag & drop files here")).toBeInTheDocument();
    expect(screen.getByText(/or click to browse/)).toBeInTheDocument();
  });

  it("shows default max size in the label", () => {
    render(<DocumentUpload {...defaultProps} />);
    expect(screen.getByText(/max 50 MB/)).toBeInTheDocument();
  });

  it("shows custom max size", () => {
    render(
      <DocumentUpload {...defaultProps} maxSize={10 * 1024 * 1024} />,
    );
    expect(screen.getByText(/max 10 MB/)).toBeInTheDocument();
  });

  it("shows accepted file types", () => {
    render(<DocumentUpload {...defaultProps} />);
    expect(
      screen.getByText(/PDF, Word, Excel, PowerPoint, Images, Text, CSV, ZIP/),
    ).toBeInTheDocument();
  });

  it("handles file selection and shows file info", async () => {
    const user = userEvent.setup();
    render(<DocumentUpload {...defaultProps} />);

    const file = new File(["test content"], "test.pdf", {
      type: "application/pdf",
    });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);

    expect(screen.getByText("test.pdf")).toBeInTheDocument();
    // PDF appears in both the file type label and the accepted types list
    const pdfElements = screen.getAllByText(/PDF/);
    expect(pdfElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows upload button after file selection", async () => {
    const user = userEvent.setup();
    render(<DocumentUpload {...defaultProps} />);

    const file = new File(["test content"], "test.pdf", {
      type: "application/pdf",
    });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);

    expect(screen.getByText("Upload 1 file")).toBeInTheDocument();
  });

  it("calls onUpload when upload button is clicked", async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    render(<DocumentUpload onUpload={onUpload} />);

    const file = new File(["test content"], "test.pdf", {
      type: "application/pdf",
    });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);
    await user.click(screen.getByText("Upload 1 file"));

    expect(onUpload).toHaveBeenCalledWith([file], {});
  });

  it("shows error for files exceeding max size", async () => {
    const user = userEvent.setup();
    render(
      <DocumentUpload {...defaultProps} maxSize={100} />,
    );

    const largeFile = new File(["x".repeat(200)], "large.pdf", {
      type: "application/pdf",
    });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, largeFile);

    expect(
      screen.getByText(/exceeds the maximum size/),
    ).toBeInTheDocument();
  });

  it("shows loading state when loading is true", async () => {
    const user = userEvent.setup();
    render(<DocumentUpload {...defaultProps} loading />);

    const file = new File(["test"], "test.pdf", {
      type: "application/pdf",
    });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);

    expect(screen.getByText("Uploading...")).toBeInTheDocument();
  });

  it("allows removing a selected file", async () => {
    const user = userEvent.setup();
    render(<DocumentUpload {...defaultProps} />);

    const file = new File(["test"], "test.pdf", {
      type: "application/pdf",
    });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(input, file);
    expect(screen.getByText("test.pdf")).toBeInTheDocument();

    // The remove button is the X button next to each file
    const removeButtons = screen.getAllByRole("button");
    // Find the remove button (not the upload button)
    const removeButton = removeButtons.find(
      (btn) => !btn.textContent?.includes("Upload"),
    );
    if (removeButton) {
      await user.click(removeButton);
    }

    expect(screen.queryByText("test.pdf")).not.toBeInTheDocument();
  });

  it("handles drag over styling", () => {
    const { container } = render(<DocumentUpload {...defaultProps} />);
    const dropZone = container.querySelector("[class*='border-dashed']")!;

    fireEvent.dragOver(dropZone, {
      dataTransfer: { files: [] },
    });

    // After drag over, it should show "Drop files here"
    expect(screen.getByText("Drop files here")).toBeInTheDocument();
  });
});
