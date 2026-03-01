import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { StatusBadge } from "../status-badge";

describe("StatusBadge", () => {
  it("renders status text with underscores replaced by spaces", () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText("in progress")).toBeInTheDocument();
  });

  it("renders a dot by default", () => {
    const { container } = render(<StatusBadge status="active" />);
    const dot = container.querySelector("[aria-hidden='true']");
    expect(dot).toBeInTheDocument();
  });

  it("does not render a dot when dot={false}", () => {
    const { container } = render(<StatusBadge status="active" dot={false} />);
    const dot = container.querySelector("[aria-hidden='true']");
    expect(dot).not.toBeInTheDocument();
  });

  it("renders children instead of status text when provided", () => {
    render(<StatusBadge status="active">Custom Label</StatusBadge>);
    expect(screen.getByText("Custom Label")).toBeInTheDocument();
    expect(screen.queryByText("active")).not.toBeInTheDocument();
  });

  it("resolves success variant for 'active' status", () => {
    const { container } = render(<StatusBadge status="active" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("success");
  });

  it("resolves warning variant for 'pending' status", () => {
    const { container } = render(<StatusBadge status="pending" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("warning");
  });

  it("resolves error variant for 'rejected' status", () => {
    const { container } = render(<StatusBadge status="rejected" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("error");
  });

  it("resolves info variant for 'new' status", () => {
    const { container } = render(<StatusBadge status="new" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("info");
  });

  it("resolves default variant for unknown status", () => {
    const { container } = render(<StatusBadge status="foobar" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("surface-2");
  });

  it("uses explicit variant over auto-resolved variant", () => {
    const { container } = render(
      <StatusBadge status="active" variant="error" />,
    );
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("error");
  });

  it("applies custom className", () => {
    const { container } = render(
      <StatusBadge status="active" className="my-custom" />,
    );
    const badge = container.firstElementChild!;
    expect(badge.className).toContain("my-custom");
  });

  it("adds pulse animation for warning variants by default", () => {
    const { container } = render(<StatusBadge status="pending" />);
    const dot = container.querySelector("[aria-hidden='true']");
    expect(dot?.className).toContain("animate-pulse");
  });

  it("does not pulse when pulse={false}", () => {
    const { container } = render(
      <StatusBadge status="pending" pulse={false} />,
    );
    const dot = container.querySelector("[aria-hidden='true']");
    expect(dot?.className).not.toContain("animate-pulse");
  });
});
