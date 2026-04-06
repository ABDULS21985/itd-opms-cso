import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/test/test-utils";

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
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
  };
});

const mockUseAuth = vi.fn();
const mockUseDocuments = vi.fn();
const mockUseFolders = vi.fn();
const mockUseVaultStats = vi.fn();
const mockDeleteMutate = vi.fn();
const mockLockMutate = vi.fn();
const mockUnlockMutate = vi.fn();
const mockArchiveMutate = vi.fn();
const mockRestoreMutate = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

vi.mock("@/hooks/use-vault", () => ({
  useDocuments: (...args: unknown[]) => mockUseDocuments(...args),
  useFolders: (...args: unknown[]) => mockUseFolders(...args),
  useVaultStats: (...args: unknown[]) => mockUseVaultStats(...args),
  useDeleteDocument: () => ({ mutate: mockDeleteMutate }),
  useLockDocument: () => ({ mutate: mockLockMutate }),
  useUnlockDocument: () => ({ mutate: mockUnlockMutate }),
  useArchiveDocument: () => ({ mutate: mockArchiveMutate }),
  useRestoreDocument: () => ({ mutate: mockRestoreMutate }),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

vi.mock("../_components/vault-folder-sidebar", () => ({
  VaultFolderSidebar: ({
    selectedFolderId,
    onSelectFolder,
    onNewFolder,
  }: {
    selectedFolderId: string | null;
    onSelectFolder: (id: string | null) => void;
    onNewFolder: () => void;
  }) => (
    <div data-testid="vault-sidebar">
      <p>Sidebar scope: {selectedFolderId ?? "all"}</p>
      <button type="button" onClick={() => onSelectFolder("folder-ops")}>
        Select Operations Folder
      </button>
      <button type="button" onClick={() => onSelectFolder(null)}>
        Select All Documents
      </button>
      <button type="button" onClick={onNewFolder}>
        Sidebar New Folder
      </button>
    </div>
  ),
}));

vi.mock("../_components/vault-toolbar", () => ({
  VaultToolbar: ({
    searchQuery,
    onSearchChange,
    viewMode,
    onViewModeChange,
    onNewFolder,
    onUpload,
  }: {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    viewMode: "grid" | "list";
    onViewModeChange: (mode: "grid" | "list") => void;
    onNewFolder: () => void;
    onUpload: () => void;
  }) => (
    <div data-testid="vault-toolbar">
      <label htmlFor="search-documents">Search documents</label>
      <input
        id="search-documents"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <p>View mode: {viewMode}</p>
      <button type="button" onClick={() => onViewModeChange("grid")}>
        Grid mode
      </button>
      <button type="button" onClick={() => onViewModeChange("list")}>
        List mode
      </button>
      <button type="button" onClick={onNewFolder}>
        Toolbar New Folder
      </button>
      <button type="button" onClick={onUpload}>
        Toolbar Upload
      </button>
    </div>
  ),
}));

vi.mock("../_components/vault-breadcrumbs", () => ({
  VaultBreadcrumbs: ({
    selectedFolderId,
  }: {
    selectedFolderId: string | null;
  }) => (
    <div data-testid="vault-breadcrumbs">
      Breadcrumb: {selectedFolderId ?? "all"}
    </div>
  ),
}));

vi.mock("../_components/vault-document-grid", () => ({
  VaultDocumentGrid: ({
    documents,
    onSelect,
  }: {
    documents: Array<{ id: string; title: string }>;
    onSelect: (id: string) => void;
  }) => (
    <div data-testid="vault-grid">
      {documents.map((document) => (
        <button
          key={document.id}
          type="button"
          onClick={() => onSelect(document.id)}
        >
          {document.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../_components/vault-document-list", () => ({
  VaultDocumentList: ({
    documents,
    onSelect,
  }: {
    documents: Array<{ id: string; title: string }>;
    onSelect: (id: string) => void;
  }) => (
    <div data-testid="vault-list">
      {documents.map((document) => (
        <button
          key={document.id}
          type="button"
          onClick={() => onSelect(document.id)}
        >
          {document.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../_components/vault-pagination", () => ({
  VaultPagination: ({
    page,
    totalPages,
  }: {
    page: number;
    totalPages: number;
  }) => (
    <div data-testid="vault-pagination">
      Page {page} of {totalPages}
    </div>
  ),
}));

vi.mock("../_components/vault-document-drawer", () => ({
  VaultDocumentDrawer: ({ documentId }: { documentId: string | null }) => (
    <div data-testid="vault-drawer">Drawer: {documentId ?? "closed"}</div>
  ),
}));

vi.mock("../_components/vault-upload-dialog", () => ({
  VaultUploadDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="upload-dialog">Upload dialog open</div> : null,
}));

vi.mock("../_components/vault-new-folder-dialog", () => ({
  VaultNewFolderDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="folder-dialog">Folder dialog open</div> : null,
}));

vi.mock("../_components/vault-share-dialog", () => ({
  VaultShareDialog: () => null,
}));

vi.mock("../_components/vault-move-dialog", () => ({
  VaultMoveDialog: () => null,
}));

vi.mock("../_components/vault-version-upload-dialog", () => ({
  VaultVersionUploadDialog: () => null,
}));

import VaultPage from "../page";

const folders = [
  {
    id: "folder-ops",
    tenantId: "tenant-1",
    parentId: null,
    name: "Operations",
    description: "Operational records",
    path: "/Operations",
    color: null,
    createdBy: "user-1",
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-20T00:00:00Z",
    documentCount: 2,
  },
  {
    id: "folder-policy",
    tenantId: "tenant-1",
    parentId: null,
    name: "Policies",
    description: "Policy library",
    path: "/Policies",
    color: null,
    createdBy: "user-1",
    createdAt: "2026-03-02T00:00:00Z",
    updatedAt: "2026-03-22T00:00:00Z",
    documentCount: 1,
  },
];

const documents = [
  {
    id: "doc-1",
    tenantId: "tenant-1",
    title: "Access Control Matrix",
    description: "Approved access model for service operations.",
    fileKey: "doc-1",
    fileName: "access-control-matrix.pdf",
    contentType: "application/pdf",
    sizeBytes: 1024,
    checksumSha256: "abc",
    classification: "policy",
    retentionUntil: "2027-04-01T00:00:00Z",
    tags: ["iam"],
    folderId: "folder-policy",
    version: 3,
    parentDocumentId: null,
    isLatest: true,
    lockedBy: null,
    lockedAt: null,
    status: "approved",
    accessLevel: "confidential",
    uploadedBy: "user-1",
    createdAt: "2026-03-05T00:00:00Z",
    updatedAt: "2026-03-24T10:00:00Z",
    confidential: true,
    legalHold: false,
    uploaderName: "Admin User",
    folderName: "Policies",
    lockedByName: null,
    expiryDate: "2026-04-20T00:00:00Z",
  },
  {
    id: "doc-2",
    tenantId: "tenant-1",
    title: "Firewall Change Evidence",
    description: "Weekly firewall validation evidence bundle.",
    fileKey: "doc-2",
    fileName: "firewall-change-evidence.pdf",
    contentType: "application/pdf",
    sizeBytes: 2048,
    checksumSha256: "def",
    classification: "audit_evidence",
    retentionUntil: "2026-08-01T00:00:00Z",
    tags: ["network"],
    folderId: "folder-ops",
    version: 2,
    parentDocumentId: null,
    isLatest: true,
    lockedBy: "user-2",
    lockedAt: "2026-03-20T10:00:00Z",
    status: "under_review",
    accessLevel: "restricted",
    uploadedBy: "user-2",
    createdAt: "2026-03-10T00:00:00Z",
    updatedAt: "2026-03-25T11:00:00Z",
    confidential: false,
    legalHold: false,
    uploaderName: "Security User",
    folderName: "Operations",
    lockedByName: "Security User",
    expiryDate: "2026-04-10T00:00:00Z",
  },
  {
    id: "doc-3",
    tenantId: "tenant-1",
    title: "Vendor Onboarding Pack",
    description: "Pending vendor onboarding forms and evidence.",
    fileKey: "doc-3",
    fileName: "vendor-onboarding.zip",
    contentType: "application/zip",
    sizeBytes: 4096,
    checksumSha256: "ghi",
    classification: "operational",
    retentionUntil: "2026-12-01T00:00:00Z",
    tags: ["vendor"],
    folderId: "folder-ops",
    version: 1,
    parentDocumentId: null,
    isLatest: true,
    lockedBy: null,
    lockedAt: null,
    status: "active",
    accessLevel: "internal",
    uploadedBy: "user-3",
    createdAt: "2026-03-12T00:00:00Z",
    updatedAt: "2026-03-21T08:00:00Z",
    confidential: false,
    legalHold: false,
    uploaderName: "Ops User",
    folderName: "Operations",
    lockedByName: null,
    expiryDate: null,
  },
];

function setDynamicDocumentsMock() {
  mockUseDocuments.mockImplementation(
    ({
      folderId,
      classification,
      status,
      search,
    }: {
      folderId?: string;
      classification?: string;
      status?: string;
      search?: string;
    }) => {
      let filtered = documents;

      if (folderId) {
        filtered = filtered.filter(
          (document) => document.folderId === folderId,
        );
      }
      if (classification) {
        filtered = filtered.filter(
          (document) => document.classification === classification,
        );
      }
      if (status) {
        filtered = filtered.filter((document) => document.status === status);
      }
      if (search) {
        const needle = search.toLowerCase();
        filtered = filtered.filter(
          (document) =>
            document.title.toLowerCase().includes(needle) ||
            (document.description ?? "").toLowerCase().includes(needle),
        );
      }

      return {
        data: {
          data: filtered,
          meta: {
            page: 1,
            pageSize: 20,
            totalItems: filtered.length,
            totalPages: 1,
          },
        },
        isLoading: false,
      };
    },
  );
}

describe("VaultPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: { id: "user-1" },
    });
    mockUseFolders.mockReturnValue({
      data: folders,
      isLoading: false,
    });
    mockUseVaultStats.mockReturnValue({
      data: {
        totalDocuments: 24,
        totalSizeBytes: 987654321,
        totalFolders: 6,
        byClassification: {
          policy: 8,
          audit_evidence: 6,
          operational: 5,
        },
        byStatus: {
          approved: 10,
          under_review: 3,
          expired: 1,
          active: 10,
        },
        recentUploads: 4,
      },
      isLoading: false,
    });
    setDynamicDocumentsMock();
  });

  it("renders the upgraded vault workspace", () => {
    render(<VaultPage />);

    expect(screen.getByText("Document vault")).toBeInTheDocument();
    expect(screen.getByText("Vault pulse")).toBeInTheDocument();
    expect(screen.getByText("Live document board")).toBeInTheDocument();
    expect(screen.getByText("Document spotlight")).toBeInTheDocument();
    expect(screen.getByText("Classification coverage")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Controlled storage, classification, and document lifecycle operations/,
      ),
    ).toBeInTheDocument();
  });

  it("filters the board when folder scope changes", async () => {
    const user = userEvent.setup();

    render(<VaultPage />);

    await user.click(
      screen.getByRole("button", { name: "Select Operations Folder" }),
    );

    expect(
      screen.getAllByText("Firewall Change Evidence").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Vendor Onboarding Pack").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Access Control Matrix")).not.toBeInTheDocument();
  });

  it("opens the vault dialogs from the primary actions", async () => {
    const user = userEvent.setup();

    render(<VaultPage />);

    await user.click(screen.getByRole("button", { name: "Upload Document" }));
    expect(screen.getByTestId("upload-dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New Folder" }));
    expect(screen.getByTestId("folder-dialog")).toBeInTheDocument();
  });

  it("shows the stronger empty state when the current search returns no documents", async () => {
    const user = userEvent.setup();

    render(<VaultPage />);

    await user.type(screen.getByLabelText("Search documents"), "nonexistent");

    expect(screen.getByText("No documents found")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Try a different search query, reset the current lens, or switch to another folder scope./,
      ),
    ).toBeInTheDocument();
  });

  it("opens the drawer when a spotlight document is selected", async () => {
    const user = userEvent.setup();

    render(<VaultPage />);

    await user.click(
      screen.getAllByRole("button", { name: "Firewall Change Evidence" })[0],
    );

    expect(screen.getByTestId("vault-drawer")).toHaveTextContent("doc-2");
  });
});
