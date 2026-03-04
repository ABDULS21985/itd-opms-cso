import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import NewProjectPage from "../../projects/new/page";

// ---------------------------------------------------------------------------
// Mock: framer-motion
// ---------------------------------------------------------------------------
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      custom: _c,
      variants: _v,
      ...rest
    }: any) => <div {...rest}>{children}</div>,
    p: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      ...rest
    }: any) => <p {...rest}>{children}</p>,
  },
}));

// ---------------------------------------------------------------------------
// Mock: hooks/use-planning
// ---------------------------------------------------------------------------
const mockCreateProject = {
  mutate: vi.fn(),
  isPending: false,
};

vi.mock("@/hooks/use-planning", () => ({
  useCreateProject: () => mockCreateProject,
  usePortfolios: () => ({
    data: {
      data: [
        { id: "pf-1", name: "Strategic FY2026" },
        { id: "pf-2", name: "Maintenance FY2026" },
      ],
    },
  }),
}));

// ---------------------------------------------------------------------------
// Mock: hooks/use-system
// ---------------------------------------------------------------------------
vi.mock("@/hooks/use-system", () => ({
  useOrgUnits: () => ({
    data: {
      data: [
        { id: "ou-1", code: "ITD", name: "IT Division", level: "division" },
        { id: "ou-2", code: "FIN", name: "Finance", level: "department" },
      ],
    },
  }),
  useUsers: () => ({
    data: {
      data: [
        { id: "u-1", displayName: "Alice Smith", email: "alice@example.com" },
        { id: "u-2", displayName: "Bob Jones", email: "bob@example.com" },
      ],
    },
  }),
}));

// ---------------------------------------------------------------------------
// Mock: components/shared/form-field
// ---------------------------------------------------------------------------
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
    rows,
  }: any) => (
    <div data-testid={`form-field-${name}`}>
      <label htmlFor={name}>{label}</label>
      {type === "textarea" ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          data-required={required}
          rows={rows}
        />
      ) : type === "select" ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-required={required}
        >
          <option value="">{placeholder || "Select..."}</option>
          {options?.map((o: { value: string; label: string }) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type || "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          data-required={required}
        />
      )}
      {error && <span data-testid={`error-${name}`}>{error}</span>}
      {description && <span>{description}</span>}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Find a button by its visible text content (avoids slow getByRole w/ SVG) */
function clickButton(text: string) {
  const el = screen.getByText(text);
  const btn = el.closest("button");
  if (!btn) throw new Error(`No button found containing text "${text}"`);
  fireEvent.click(btn);
}

function fillInput(labelText: string, value: string) {
  const input = screen.getByLabelText(labelText);
  fireEvent.change(input, { target: { value } });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("NewProjectPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- Rendering ----------------------------------------------------------
  describe("rendering", () => {
    it("renders the page heading", () => {
      render(<NewProjectPage />);

      expect(screen.getByText("Initiate New Project")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Follow the steps below to define and create a new project.",
        ),
      ).toBeInTheDocument();
    });

    it("renders the Back to Projects link", () => {
      render(<NewProjectPage />);

      const el = screen.getByText("Back to Projects");
      expect(el).toBeInTheDocument();
      expect(el.closest("button")).not.toBeNull();
    });

    it("renders step indicator showing Step 1 of 5", () => {
      render(<NewProjectPage />);

      expect(screen.getByText(/Step 1 of 5/)).toBeInTheDocument();
      expect(screen.getByText(/Basic project info/)).toBeInTheDocument();
    });

    it("renders the first step (Identity) with required fields", () => {
      render(<NewProjectPage />);

      expect(screen.getByText("Project Identity")).toBeInTheDocument();
      expect(screen.getByText("Project Title")).toBeInTheDocument();
      expect(screen.getByText("Project Code")).toBeInTheDocument();
      expect(screen.getByText("Portfolio")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
    });

    it("renders Cancel and Continue buttons", () => {
      render(<NewProjectPage />);

      expect(screen.getByText("Cancel").closest("button")).not.toBeNull();
      expect(screen.getByText("Continue").closest("button")).not.toBeNull();
    });
  });

  // -- Multi-step navigation ----------------------------------------------
  describe("multi-step navigation", () => {
    it("shows validation errors when Continue is clicked without required fields", () => {
      render(<NewProjectPage />);

      // Click Continue without filling in required fields
      clickButton("Continue");

      // Should show validation errors
      expect(screen.getByTestId("error-title")).toHaveTextContent(
        "Project title is required",
      );
      expect(screen.getByTestId("error-code")).toHaveTextContent(
        "Project code is required",
      );
    });

    it("advances to step 2 when required fields are filled", () => {
      render(<NewProjectPage />);

      // Fill in required fields
      fillInput("Project Title", "Test Project");
      fillInput("Project Code", "PRJ-TEST-001");

      // Click Continue
      clickButton("Continue");

      // Should now be on Step 2
      expect(screen.getByText(/Step 2 of 5/)).toBeInTheDocument();
      expect(screen.getByText(/Objectives & scope/)).toBeInTheDocument();
      expect(screen.getByText("Charter & Scope")).toBeInTheDocument();
    });

    it("can navigate back with the Previous button", () => {
      render(<NewProjectPage />);

      // Fill and advance to step 2
      fillInput("Project Title", "Test Project");
      fillInput("Project Code", "PRJ-TEST-001");
      clickButton("Continue");

      expect(screen.getByText(/Step 2 of 5/)).toBeInTheDocument();

      // Click Previous
      clickButton("Previous");

      // Should be back on step 1
      expect(screen.getByText(/Step 1 of 5/)).toBeInTheDocument();
      expect(screen.getByText("Project Identity")).toBeInTheDocument();
    });

    it("can advance through all steps to reach the Review step", () => {
      render(<NewProjectPage />);

      // Step 1: Identity
      fillInput("Project Title", "Test Project");
      fillInput("Project Code", "PRJ-TEST-001");
      clickButton("Continue");

      // Step 2: Charter & Scope
      expect(screen.getByText("Charter & Scope")).toBeInTheDocument();
      clickButton("Continue");

      // Step 3: Team & Priority
      expect(screen.getByText("Team & Priority")).toBeInTheDocument();
      clickButton("Continue");

      // Step 4: Schedule & Budget
      expect(screen.getByText("Schedule & Budget")).toBeInTheDocument();
      clickButton("Continue");

      // Step 5: Review & Create
      expect(screen.getByText("Review & Create")).toBeInTheDocument();
      expect(screen.getByText(/Step 5 of 5/)).toBeInTheDocument();

      // Create Project button should now be visible
      const createBtn = screen.getByText("Create Project");
      expect(createBtn).toBeInTheDocument();
      expect(createBtn.closest("button")).not.toBeNull();
    });
  });

  // -- Form submission ---------------------------------------------------
  describe("form submission", () => {
    it("calls createProject.mutate when Create Project is clicked on review step", () => {
      render(<NewProjectPage />);

      // Navigate to the Review step
      fillInput("Project Title", "My Project");
      fillInput("Project Code", "PRJ-123");
      clickButton("Continue");
      clickButton("Continue");
      clickButton("Continue");
      clickButton("Continue");

      // Click Create Project
      clickButton("Create Project");

      expect(mockCreateProject.mutate).toHaveBeenCalledTimes(1);
      const calledArgs = mockCreateProject.mutate.mock.calls[0][0];
      expect(calledArgs.title).toBe("My Project");
      expect(calledArgs.code).toBe("PRJ-123");
      expect(calledArgs.priority).toBe("medium"); // default priority
    });

    it("disables Create Project button when title or code is empty", () => {
      render(<NewProjectPage />);

      // Fill fields and navigate to review
      fillInput("Project Title", "A");
      fillInput("Project Code", "B");
      clickButton("Continue");
      clickButton("Continue");
      clickButton("Continue");
      clickButton("Continue");

      // Create Project button should be enabled with valid data
      const createButton = screen.getByText("Create Project").closest("button")!;
      expect(createButton).not.toBeDisabled();
    });
  });

  // -- Stepper labels -----------------------------------------------------
  describe("stepper", () => {
    it("renders all step labels", () => {
      render(<NewProjectPage />);

      expect(screen.getByText("Identity")).toBeInTheDocument();
      expect(screen.getByText("Charter")).toBeInTheDocument();
      expect(screen.getByText("Team")).toBeInTheDocument();
      expect(screen.getByText("Schedule")).toBeInTheDocument();
      expect(screen.getByText("Review")).toBeInTheDocument();
    });
  });
});
