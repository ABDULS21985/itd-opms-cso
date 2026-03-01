import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { server } from "@/test/mocks/server";
import {
  createWrapper,
  mockGet,
  mockPost,
  mockPut,
  mockDelete,
  paginatedMeta,
} from "./hook-test-utils";
import {
  useKBCategories,
  useKBCategory,
  useCreateKBCategory,
  useUpdateKBCategory,
  useKBArticles,
  useKBArticle,
  useKBArticleBySlug,
  useSearchKBArticles,
  useCreateKBArticle,
  useUpdateKBArticle,
  useDeleteKBArticle,
  usePublishKBArticle,
  useArchiveKBArticle,
  useRecordArticleView,
  useArticleFeedback,
  useFeedbackStats,
  useCreateFeedback,
  useDeleteFeedback,
  useAnnouncements,
  useAnnouncement,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
} from "@/hooks/use-knowledge";

/* ================================================================== */
/*  KB Categories                                                      */
/* ================================================================== */

describe("useKBCategories", () => {
  it("fetches KB categories", async () => {
    const cat = { id: "kbc-1", name: "General" };
    server.use(mockGet("/knowledge/categories", [cat]));

    const { result } = renderHook(() => useKBCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([cat]);
  });
});

describe("useKBCategory", () => {
  it("fetches a single KB category", async () => {
    const cat = { id: "kbc-1", name: "General" };
    server.use(mockGet("/knowledge/categories/kbc-1", cat));

    const { result } = renderHook(() => useKBCategory("kbc-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(cat);
  });
});

describe("useCreateKBCategory", () => {
  it("calls POST /knowledge/categories", async () => {
    server.use(mockPost("/knowledge/categories", { id: "kbc-2" }));

    const { result } = renderHook(() => useCreateKBCategory(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "FAQ" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateKBCategory", () => {
  it("calls PUT /knowledge/categories/{id}", async () => {
    server.use(mockPut("/knowledge/categories/kbc-1", { id: "kbc-1" }));

    const { result } = renderHook(() => useUpdateKBCategory("kbc-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  KB Articles                                                        */
/* ================================================================== */

describe("useKBArticles", () => {
  it("fetches paginated KB articles", async () => {
    const article = { id: "art-1", title: "How to reset password" };
    server.use(mockGet("/knowledge/articles", [article], paginatedMeta));

    const { result } = renderHook(() => useKBArticles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useKBArticle", () => {
  it("fetches a single KB article", async () => {
    const article = { id: "art-1", title: "How to reset password" };
    server.use(mockGet("/knowledge/articles/art-1", article));

    const { result } = renderHook(() => useKBArticle("art-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(article);
  });
});

describe("useKBArticleBySlug", () => {
  it("fetches a KB article by slug", async () => {
    const article = { id: "art-1", slug: "reset-password" };
    server.use(mockGet("/knowledge/articles/slug/reset-password", article));

    const { result } = renderHook(() => useKBArticleBySlug("reset-password"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(article);
  });
});

describe("useSearchKBArticles", () => {
  it("fetches KB article search results", async () => {
    const articles = [{ id: "art-1", title: "Password" }];
    server.use(mockGet("/knowledge/articles/search", articles, paginatedMeta));

    const { result } = renderHook(() => useSearchKBArticles("password"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useCreateKBArticle", () => {
  it("calls POST /knowledge/articles", async () => {
    server.use(mockPost("/knowledge/articles", { id: "art-2" }));

    const { result } = renderHook(() => useCreateKBArticle(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New Article" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateKBArticle", () => {
  it("calls PUT /knowledge/articles/{id}", async () => {
    server.use(mockPut("/knowledge/articles/art-1", { id: "art-1" }));

    const { result } = renderHook(() => useUpdateKBArticle("art-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteKBArticle", () => {
  it("calls DELETE /knowledge/articles/{id}", async () => {
    server.use(mockDelete("/knowledge/articles/art-1"));

    const { result } = renderHook(() => useDeleteKBArticle(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("art-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("usePublishKBArticle", () => {
  it("calls POST /knowledge/articles/{id}/publish", async () => {
    server.use(mockPost("/knowledge/articles/art-1/publish"));

    const { result } = renderHook(() => usePublishKBArticle(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("art-1" as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useArchiveKBArticle", () => {
  it("calls POST /knowledge/articles/{id}/archive", async () => {
    server.use(mockPost("/knowledge/articles/art-1/archive"));

    const { result } = renderHook(() => useArchiveKBArticle(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("art-1" as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useRecordArticleView", () => {
  it("calls POST /knowledge/articles/{id}/views", async () => {
    server.use(mockPost("/knowledge/articles/art-1/view"));

    const { result } = renderHook(() => useRecordArticleView(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("art-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Article Feedback                                                   */
/* ================================================================== */

describe("useArticleFeedback", () => {
  it("fetches feedback for an article", async () => {
    const feedback = [{ id: "fb-1", rating: 5 }];
    server.use(mockGet("/knowledge/articles/art-1/feedback", feedback));

    const { result } = renderHook(() => useArticleFeedback("art-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(feedback);
  });
});

describe("useFeedbackStats", () => {
  it("fetches feedback stats for an article", async () => {
    const stats = { avgRating: 4.5, totalFeedback: 20 };
    server.use(mockGet("/knowledge/articles/art-1/feedback/stats", stats));

    const { result } = renderHook(() => useFeedbackStats("art-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

describe("useCreateFeedback", () => {
  it("calls POST /knowledge/articles/{id}/feedback", async () => {
    server.use(mockPost("/knowledge/articles/art-1/feedback", { id: "fb-2" }));

    const { result } = renderHook(() => useCreateFeedback("art-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ rating: 4, comment: "Helpful" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteFeedback", () => {
  it("calls DELETE /knowledge/articles/{id}/feedback/{fbId}", async () => {
    server.use(mockDelete("/knowledge/articles/art-1/feedback/fb-1"));

    const { result } = renderHook(() => useDeleteFeedback("art-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate("fb-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

/* ================================================================== */
/*  Announcements                                                      */
/* ================================================================== */

describe("useAnnouncements", () => {
  it("fetches paginated announcements", async () => {
    const ann = { id: "ann-1", title: "System Update" };
    server.use(mockGet("/knowledge/announcements", [ann], paginatedMeta));

    const { result } = renderHook(() => useAnnouncements(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});

describe("useAnnouncement", () => {
  it("fetches a single announcement", async () => {
    const ann = { id: "ann-1", title: "System Update" };
    server.use(mockGet("/knowledge/announcements/ann-1", ann));

    const { result } = renderHook(() => useAnnouncement("ann-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(ann);
  });
});

describe("useCreateAnnouncement", () => {
  it("calls POST /knowledge/announcements", async () => {
    server.use(mockPost("/knowledge/announcements", { id: "ann-2" }));

    const { result } = renderHook(() => useCreateAnnouncement(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New Announcement" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateAnnouncement", () => {
  it("calls PUT /knowledge/announcements/{id}", async () => {
    server.use(mockPut("/knowledge/announcements/ann-1", { id: "ann-1" }));

    const { result } = renderHook(() => useUpdateAnnouncement("ann-1"), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "Updated" } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteAnnouncement", () => {
  it("calls DELETE /knowledge/announcements/{id}", async () => {
    server.use(mockDelete("/knowledge/announcements/ann-1"));

    const { result } = renderHook(() => useDeleteAnnouncement(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("ann-1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
