import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  KBCategory,
  KBArticle,
  KBArticleFeedback,
  FeedbackStats,
  Announcement,
  PaginatedResponse,
} from "@/types";

/* ================================================================== */
/*  KB Categories — Queries                                              */
/* ================================================================== */

/**
 * GET /knowledge/categories - list KB categories.
 */
export function useKBCategories(parentId?: string) {
  return useQuery({
    queryKey: ["kb-categories", parentId],
    queryFn: () =>
      apiClient.get<KBCategory[]>("/knowledge/categories", {
        parent_id: parentId,
      }),
  });
}

/**
 * GET /knowledge/categories/{id} - single KB category.
 */
export function useKBCategory(id: string | undefined) {
  return useQuery({
    queryKey: ["kb-category", id],
    queryFn: () =>
      apiClient.get<KBCategory>(`/knowledge/categories/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  KB Categories — Mutations                                            */
/* ================================================================== */

/**
 * POST /knowledge/categories - create a KB category.
 */
export function useCreateKBCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<KBCategory>) =>
      apiClient.post<KBCategory>("/knowledge/categories", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-categories"] });
      toast.success("Category created successfully");
    },
    onError: () => {
      toast.error("Failed to create category");
    },
  });
}

/**
 * PUT /knowledge/categories/{id} - update a KB category.
 */
export function useUpdateKBCategory(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<KBCategory>) =>
      apiClient.put<KBCategory>(`/knowledge/categories/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-categories"] });
      queryClient.invalidateQueries({ queryKey: ["kb-category", id] });
      toast.success("Category updated successfully");
    },
    onError: () => {
      toast.error("Failed to update category");
    },
  });
}

/* ================================================================== */
/*  KB Articles — Queries                                                */
/* ================================================================== */

/**
 * GET /knowledge/articles - paginated list of articles.
 */
export function useKBArticles(
  page = 1,
  limit = 20,
  categoryId?: string,
  status?: string,
  type?: string,
) {
  return useQuery({
    queryKey: ["kb-articles", page, limit, categoryId, status, type],
    queryFn: () =>
      apiClient.get<PaginatedResponse<KBArticle>>("/knowledge/articles", {
        page,
        limit,
        category_id: categoryId,
        status,
        type,
      }),
  });
}

/**
 * GET /knowledge/articles/{id} - single article by ID.
 */
export function useKBArticle(id: string | undefined) {
  return useQuery({
    queryKey: ["kb-article", id],
    queryFn: () =>
      apiClient.get<KBArticle>(`/knowledge/articles/${id}`),
    enabled: !!id,
  });
}

/**
 * GET /knowledge/articles/slug/{slug} - single article by slug.
 */
export function useKBArticleBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["kb-article-slug", slug],
    queryFn: () =>
      apiClient.get<KBArticle>(`/knowledge/articles/slug/${slug}`),
    enabled: !!slug,
  });
}

/**
 * GET /knowledge/articles/search?q=... - search articles.
 */
export function useSearchKBArticles(
  query: string,
  page = 1,
  limit = 20,
) {
  return useQuery({
    queryKey: ["kb-articles-search", query, page, limit],
    queryFn: () =>
      apiClient.get<PaginatedResponse<KBArticle>>(
        "/knowledge/articles/search",
        { q: query, page, limit },
      ),
    enabled: query.length > 0,
  });
}

/* ================================================================== */
/*  KB Articles — Mutations                                              */
/* ================================================================== */

/**
 * POST /knowledge/articles - create an article.
 */
export function useCreateKBArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<KBArticle>) =>
      apiClient.post<KBArticle>("/knowledge/articles", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      toast.success("Article created successfully");
    },
    onError: () => {
      toast.error("Failed to create article");
    },
  });
}

/**
 * PUT /knowledge/articles/{id} - update an article.
 */
export function useUpdateKBArticle(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<KBArticle>) =>
      apiClient.put<KBArticle>(`/knowledge/articles/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      queryClient.invalidateQueries({ queryKey: ["kb-article", id] });
      queryClient.invalidateQueries({ queryKey: ["kb-article-slug"] });
      toast.success("Article updated successfully");
    },
    onError: () => {
      toast.error("Failed to update article");
    },
  });
}

/**
 * DELETE /knowledge/articles/{id} - delete an article.
 */
export function useDeleteKBArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/knowledge/articles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      toast.success("Article deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete article");
    },
  });
}

/**
 * POST /knowledge/articles/{id}/publish - publish an article.
 */
export function usePublishKBArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/knowledge/articles/${id}/publish`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      queryClient.invalidateQueries({ queryKey: ["kb-article"] });
      queryClient.invalidateQueries({ queryKey: ["kb-article-slug"] });
      toast.success("Article published successfully");
    },
    onError: () => {
      toast.error("Failed to publish article");
    },
  });
}

/**
 * POST /knowledge/articles/{id}/archive - archive an article.
 */
export function useArchiveKBArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/knowledge/articles/${id}/archive`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      queryClient.invalidateQueries({ queryKey: ["kb-article"] });
      queryClient.invalidateQueries({ queryKey: ["kb-article-slug"] });
      toast.success("Article archived successfully");
    },
    onError: () => {
      toast.error("Failed to archive article");
    },
  });
}

/**
 * POST /knowledge/articles/{id}/view - record article view.
 */
export function useRecordArticleView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/knowledge/articles/${id}/view`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-article"] });
      queryClient.invalidateQueries({ queryKey: ["kb-article-slug"] });
    },
  });
}

/* ================================================================== */
/*  Article Feedback — Queries                                           */
/* ================================================================== */

/**
 * GET /knowledge/articles/{articleId}/feedback - list feedback.
 */
export function useArticleFeedback(articleId: string | undefined) {
  return useQuery({
    queryKey: ["article-feedback", articleId],
    queryFn: () =>
      apiClient.get<KBArticleFeedback[]>(
        `/knowledge/articles/${articleId}/feedback`,
      ),
    enabled: !!articleId,
  });
}

/**
 * GET /knowledge/articles/{articleId}/feedback/stats - feedback stats.
 */
export function useFeedbackStats(articleId: string | undefined) {
  return useQuery({
    queryKey: ["feedback-stats", articleId],
    queryFn: () =>
      apiClient.get<FeedbackStats>(
        `/knowledge/articles/${articleId}/feedback/stats`,
      ),
    enabled: !!articleId,
  });
}

/* ================================================================== */
/*  Article Feedback — Mutations                                         */
/* ================================================================== */

/**
 * POST /knowledge/articles/{articleId}/feedback - create feedback.
 */
export function useCreateFeedback(articleId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { isHelpful: boolean; comment?: string }) =>
      apiClient.post<KBArticleFeedback>(
        `/knowledge/articles/${articleId}/feedback`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["article-feedback", articleId],
      });
      queryClient.invalidateQueries({
        queryKey: ["feedback-stats", articleId],
      });
      queryClient.invalidateQueries({ queryKey: ["kb-article"] });
      queryClient.invalidateQueries({ queryKey: ["kb-article-slug"] });
      toast.success("Feedback submitted");
    },
    onError: () => {
      toast.error("Failed to submit feedback");
    },
  });
}

/**
 * DELETE /knowledge/articles/{articleId}/feedback/{id} - delete feedback.
 */
export function useDeleteFeedback(articleId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(
        `/knowledge/articles/${articleId}/feedback/${id}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["article-feedback", articleId],
      });
      queryClient.invalidateQueries({
        queryKey: ["feedback-stats", articleId],
      });
      toast.success("Feedback removed");
    },
    onError: () => {
      toast.error("Failed to remove feedback");
    },
  });
}

/* ================================================================== */
/*  Announcements — Queries                                              */
/* ================================================================== */

/**
 * GET /knowledge/announcements - paginated list of announcements.
 */
export function useAnnouncements(
  page = 1,
  limit = 20,
  isActive?: boolean,
) {
  return useQuery({
    queryKey: ["announcements", page, limit, isActive],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Announcement>>(
        "/knowledge/announcements",
        {
          page,
          limit,
          is_active: isActive,
        },
      ),
  });
}

/**
 * GET /knowledge/announcements/{id} - single announcement.
 */
export function useAnnouncement(id: string | undefined) {
  return useQuery({
    queryKey: ["announcement", id],
    queryFn: () =>
      apiClient.get<Announcement>(`/knowledge/announcements/${id}`),
    enabled: !!id,
  });
}

/* ================================================================== */
/*  Announcements — Mutations                                            */
/* ================================================================== */

/**
 * POST /knowledge/announcements - create an announcement.
 */
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Announcement>) =>
      apiClient.post<Announcement>("/knowledge/announcements", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement created successfully");
    },
    onError: () => {
      toast.error("Failed to create announcement");
    },
  });
}

/**
 * PUT /knowledge/announcements/{id} - update an announcement.
 */
export function useUpdateAnnouncement(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Announcement>) =>
      apiClient.put<Announcement>(`/knowledge/announcements/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcement", id] });
      toast.success("Announcement updated successfully");
    },
    onError: () => {
      toast.error("Failed to update announcement");
    },
  });
}

/**
 * DELETE /knowledge/announcements/{id} - delete an announcement.
 */
export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/knowledge/announcements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete announcement");
    },
  });
}
