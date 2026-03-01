import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent, waitFor } from "@/test/test-utils";
import { InlineText, InlineSelect, InlineDate } from "../inline-edit";

// ---------------------------------------------------------------------------
// Mock sonner toast
// ---------------------------------------------------------------------------
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("InlineText", () => {
  const defaultProps = {
    value: "Hello World",
    onSave: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the current value in display mode", () => {
    render(<InlineText {...defaultProps} />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders placeholder when value is empty", () => {
    render(<InlineText {...defaultProps} value="" placeholder="Click to add" />);
    expect(screen.getByText("Click to add")).toBeInTheDocument();
  });

  it("renders default 'Empty' placeholder when value is empty and no placeholder", () => {
    render(<InlineText {...defaultProps} value="" />);
    expect(screen.getByText("Empty")).toBeInTheDocument();
  });

  it("enters edit mode on click", async () => {
    const user = userEvent.setup();
    render(<InlineText {...defaultProps} />);

    await user.click(screen.getByText("Hello World"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("Hello World");
  });

  it("does not enter edit mode when editable is false", async () => {
    const user = userEvent.setup();
    render(<InlineText {...defaultProps} editable={false} />);

    await user.click(screen.getByText("Hello World"));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("saves on Enter key", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<InlineText value="Hello" onSave={onSave} />);

    await user.click(screen.getByText("Hello"));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Updated");
    await user.keyboard("{Enter}");

    expect(onSave).toHaveBeenCalledWith("Updated");
  });

  it("cancels on Escape key and reverts to original value", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<InlineText value="Hello" onSave={onSave} />);

    await user.click(screen.getByText("Hello"));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Changed");
    await user.keyboard("{Escape}");

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("does not call onSave when value is unchanged", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<InlineText value="Hello" onSave={onSave} />);

    await user.click(screen.getByText("Hello"));
    // Just blur without changing
    await user.tab();

    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows validation error", async () => {
    const user = userEvent.setup();
    const validate = (v: string) =>
      v.length < 3 ? "Too short" : null;
    render(
      <InlineText value="Hello" onSave={vi.fn()} validate={validate} />,
    );

    await user.click(screen.getByText("Hello"));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Hi");
    await user.keyboard("{Enter}");

    expect(screen.getByText("Too short")).toBeInTheDocument();
  });
});

describe("InlineSelect", () => {
  const options = [
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
  ];

  const defaultProps = {
    value: "open",
    options,
    onSave: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders value in display mode", () => {
    render(<InlineSelect {...defaultProps} />);
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("renders with custom renderValue", () => {
    render(
      <InlineSelect
        {...defaultProps}
        renderValue={(v) => <span>Status: {v}</span>}
      />,
    );
    expect(screen.getByText("Status: open")).toBeInTheDocument();
  });

  it("enters edit mode on click", async () => {
    const user = userEvent.setup();
    render(<InlineSelect {...defaultProps} />);

    await user.click(screen.getByText("open"));
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("does not enter edit mode when editable is false", async () => {
    const user = userEvent.setup();
    render(<InlineSelect {...defaultProps} editable={false} />);

    await user.click(screen.getByText("open"));
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("calls onSave when a different option is selected", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<InlineSelect {...defaultProps} onSave={onSave} />);

    await user.click(screen.getByText("open"));
    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "closed");

    expect(onSave).toHaveBeenCalledWith("closed");
  });
});

describe("InlineDate", () => {
  const defaultProps = {
    value: "2024-06-15",
    onSave: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders formatted date in display mode", () => {
    render(<InlineDate {...defaultProps} />);
    // The date is formatted by toLocaleDateString()
    // Just check it's displayed (format depends on locale)
    const el = screen.getByText(/2024|6\/15|Jun/);
    expect(el).toBeInTheDocument();
  });

  it("renders 'No date' when value is null", () => {
    render(<InlineDate value={null} onSave={vi.fn()} />);
    expect(screen.getByText("No date")).toBeInTheDocument();
  });

  it("renders custom display format", () => {
    render(
      <InlineDate
        {...defaultProps}
        displayFormat={() => "Custom Date Display"}
      />,
    );
    expect(screen.getByText("Custom Date Display")).toBeInTheDocument();
  });

  it("does not enter edit mode when editable is false", async () => {
    const user = userEvent.setup();
    render(<InlineDate {...defaultProps} editable={false} />);

    const dateEl = screen.getByText(/2024|6\/15|Jun/);
    await user.click(dateEl);
    expect(screen.queryByDisplayValue("2024-06-15")).not.toBeInTheDocument();
  });
});
