import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test/test-utils";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
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
            custom,
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

vi.mock("@/components/shared/form-field", () => ({
  FormField: ({
    label,
    name,
    value,
    onChange,
    placeholder,
    required,
    error,
    type,
    options,
    description,
  }: any) => (
    <div data-testid={`field-${name}`}>
      <label htmlFor={name}>{label}</label>
      {type === "select" ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          data-required={required}
        >
          <option value="">{placeholder || "Select..."}</option>
          {options?.map((option: { value: string; label: string }) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          data-required={required}
        />
      )}
      {error && <span data-testid={`error-${name}`}>{error}</span>}
      {description && <span>{description}</span>}
    </div>
  ),
}));

const mockCreateArticle = {
  mutate: vi.fn(),
  isPending: false,
};

const mockUseKBCategories = vi.fn();

vi.mock("@/hooks/use-knowledge", () => ({
  useCreateKBArticle: () => mockCreateArticle,
  useKBCategories: (...args: unknown[]) => mockUseKBCategories(...args),
}));

import NewArticlePage from "../../knowledge/articles/new/page";

function fillInput(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function clickButton(text: string) {
  const button = screen.getByText(text).closest("button");
  if (!button) throw new Error(`No button found for text: ${text}`);
  fireEvent.click(button);
}

describe("NewArticlePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseKBCategories.mockReturnValue({
      data: [
        {
          id: "cat-1",
          tenantId: "tenant-1",
          name: "Operations",
          description: "Operational runbooks and service guidance.",
          sortOrder: 1,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-20T00:00:00.000Z",
        },
        {
          id: "cat-2",
          tenantId: "tenant-1",
          name: "Security",
          description: "Security knowledge and response guidance.",
          sortOrder: 2,
          createdAt: "2026-03-02T00:00:00.000Z",
          updatedAt: "2026-03-21T00:00:00.000Z",
        },
      ],
      isLoading: false,
    });
  });

  it("renders the upgraded authoring workspace", () => {
    render(<NewArticlePage />);

    expect(screen.getByText("Create New Article")).toBeInTheDocument();
    expect(screen.getByText("Authoring pulse")).toBeInTheDocument();
    expect(screen.getByText("Publishing workflow")).toBeInTheDocument();
    expect(screen.getByText("Authoring checklist")).toBeInTheDocument();
    expect(screen.getByText("Category map")).toBeInTheDocument();
  });

  it("shows validation errors and auto-generates the slug", () => {
    render(<NewArticlePage />);

    clickButton("Continue");

    expect(screen.getByTestId("error-title")).toHaveTextContent(
      "Title is required",
    );
    expect(screen.getByTestId("error-slug")).toHaveTextContent(
      "Slug is required",
    );

    fillInput("Title", "Reset Password Guide");

    expect(screen.getByLabelText("Slug")).toHaveValue("reset-password-guide");
  });

  it("advances through metadata and content to the review step", () => {
    render(<NewArticlePage />);

    fillInput("Title", "Reset Password Guide");
    fillInput("Tags", "password, security");
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "cat-2" },
    });

    clickButton("Continue");

    expect(screen.getByText("Write the body")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Content \(Markdown\)/), {
      target: {
        value:
          "## Reset steps\nOpen the admin console and follow the password reset workflow.",
      },
    });

    clickButton("Continue");

    expect(
      screen.getByText("Review before publishing to draft"),
    ).toBeInTheDocument();
    expect(screen.getByText("Saved as draft on create")).toBeInTheDocument();
    expect(screen.getAllByText("Reset Password Guide").length).toBeGreaterThan(0);
  });

  it("submits the article payload and redirects on success", () => {
    mockCreateArticle.mutate.mockImplementation(
      (_payload: unknown, options?: { onSuccess?: () => void }) => {
        options?.onSuccess?.();
      },
    );

    render(<NewArticlePage />);

    fillInput("Title", "Reset Password Guide");
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "cat-2" },
    });
    fillInput("Tags", "password, security");

    clickButton("Continue");

    fireEvent.change(screen.getByLabelText(/Content \(Markdown\)/), {
      target: {
        value:
          "## Reset steps\nOpen the admin console and follow the password reset workflow.",
      },
    });

    clickButton("Continue");
    clickButton("Create Article");

    expect(mockCreateArticle.mutate).toHaveBeenCalledTimes(1);
    expect(mockCreateArticle.mutate).toHaveBeenCalledWith(
      {
        title: "Reset Password Guide",
        slug: "reset-password-guide",
        type: "how_to",
        categoryId: "cat-2",
        tags: ["password", "security"],
        content:
          "## Reset steps\nOpen the admin console and follow the password reset workflow.",
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
    expect(mockPush).toHaveBeenCalledWith("/dashboard/knowledge");
  });
});
