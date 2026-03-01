import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { EmptyState } from "../empty-state";
import { AlertCircle } from "lucide-react";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState title="No items found" />);
    expect(
      screen.getByRole("heading", { name: "No items found" }),
    ).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState title="No items" description="Try adjusting your filters" />,
    );
    expect(screen.getByText("Try adjusting your filters")).toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    const { container } = render(<EmptyState title="No items" />);
    // Only the heading, no <p> tags
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(0);
  });

  it("renders action element when provided", () => {
    render(
      <EmptyState
        title="No items"
        action={<button>Create Item</button>}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Create Item" }),
    ).toBeInTheDocument();
  });

  it("does not render action wrapper when not provided", () => {
    const { container } = render(<EmptyState title="No items" />);
    // Only the icon div and heading exist
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("accepts a custom icon", () => {
    // Just verifying it renders without error when a custom icon is passed
    render(<EmptyState title="No alerts" icon={AlertCircle} />);
    expect(
      screen.getByRole("heading", { name: "No alerts" }),
    ).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <EmptyState title="No items" className="custom-class" />,
    );
    expect(container.firstElementChild?.className).toContain("custom-class");
  });
});
