import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "@/test/test-utils";
import { FormField } from "../form-field";

// ---------------------------------------------------------------------------
// Mock framer-motion
// ---------------------------------------------------------------------------
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    span: ({ children, ...rest }: any) => <span {...rest}>{children}</span>,
    p: ({ children, ...rest }: any) => <p {...rest}>{children}</p>,
  },
}));

describe("FormField", () => {
  const defaultProps = {
    label: "Email",
    name: "email",
    value: "",
    onChange: vi.fn(),
  };

  it("renders a label with the given text", () => {
    render(<FormField {...defaultProps} />);
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("renders a text input by default", () => {
    render(<FormField {...defaultProps} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders required indicator when required is true", () => {
    render(<FormField {...defaultProps} required />);
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("calls onChange when user types", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FormField {...defaultProps} onChange={onChange} />);

    await user.type(screen.getByRole("textbox"), "test@example.com");
    expect(onChange).toHaveBeenCalled();
  });

  it("renders error message when error prop is provided", () => {
    render(<FormField {...defaultProps} error="Invalid email" />);
    expect(screen.getByText("Invalid email")).toBeInTheDocument();
  });

  it("renders description when provided and no error", () => {
    render(
      <FormField {...defaultProps} description="Enter your work email" />,
    );
    expect(screen.getByText("Enter your work email")).toBeInTheDocument();
  });

  it("hides description when error is shown", () => {
    render(
      <FormField
        {...defaultProps}
        description="Enter your work email"
        error="Invalid email"
      />,
    );
    expect(
      screen.queryByText("Enter your work email"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Invalid email")).toBeInTheDocument();
  });

  it("renders a textarea when type is textarea", () => {
    render(<FormField {...defaultProps} type="textarea" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.tagName.toLowerCase()).toBe("textarea");
  });

  it("renders a select when type is select", () => {
    const options = [
      { value: "us", label: "United States" },
      { value: "uk", label: "United Kingdom" },
    ];
    render(
      <FormField
        {...defaultProps}
        type="select"
        options={options}
        placeholder="Choose country"
      />,
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Choose country")).toBeInTheDocument();
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
  });

  it("disables the input when disabled is true", () => {
    render(<FormField {...defaultProps} disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("applies placeholder text", () => {
    render(
      <FormField {...defaultProps} placeholder="Enter your email" />,
    );
    expect(
      screen.getByPlaceholderText("Enter your email"),
    ).toBeInTheDocument();
  });

  it("label htmlFor links to input id", () => {
    render(<FormField {...defaultProps} />);
    const input = screen.getByRole("textbox");
    const label = screen.getByText("Email");
    expect(label).toHaveAttribute("for", input.id);
  });
});
