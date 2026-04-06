/* ====================================================================== */
/*  Knowledge Management Types                                              */
/* ====================================================================== */

export interface KBCategory {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  parentId?: string;
  icon?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface KBArticle {
  id: string;
  tenantId: string;
  categoryId?: string;
  title: string;
  slug: string;
  content: string;
  status: string;
  version: number;
  type: string;
  tags: string[];
  authorId: string;
  reviewerId?: string;
  publishedAt?: string;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  linkedTicketIds: string[];
  createdAt: string;
  updatedAt: string;
  /** Enriched: author display name (populated via JOIN on read). */
  authorName?: string;
  /** Enriched: reviewer display name (populated via JOIN on read). */
  reviewerName?: string;
}

export interface KBArticleVersion {
  id: string;
  articleId: string;
  version: number;
  content: string;
  changedBy: string;
  createdAt: string;
}

export interface KBArticleFeedback {
  id: string;
  articleId: string;
  userId: string;
  isHelpful: boolean;
  comment?: string;
  createdAt: string;
}

export interface FeedbackStats {
  total: number;
  helpful: number;
  notHelpful: number;
}

export interface Announcement {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  priority: string;
  targetAudience: string;
  targetIds: string[];
  publishedAt?: string;
  expiresAt?: string;
  authorId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ====================================================================== */
/*  Knowledge Management Request / Mutation Types                           */
/*                                                                          */
/*  These mirror the backend DTO structs and are used by hooks to enforce   */
/*  correct payload shapes at compile time.                                 */
/* ====================================================================== */

/** POST /knowledge/categories */
export interface CreateKBCategoryRequest {
  name: string;
  description?: string;
  parentId?: string;
  icon?: string;
  sortOrder?: number;
}

/** PUT /knowledge/categories/{id} */
export interface UpdateKBCategoryRequest {
  name?: string;
  description?: string;
  parentId?: string;
  icon?: string;
  sortOrder?: number;
}

/** POST /knowledge/articles */
export interface CreateKBArticleRequest {
  title: string;
  slug: string;
  content: string;
  type: string;
  categoryId?: string;
  tags?: string[];
}

/** PUT /knowledge/articles/{id} */
export interface UpdateKBArticleRequest {
  categoryId?: string;
  title?: string;
  slug?: string;
  content?: string;
  type?: string;
  /** Pass an empty array to keep existing tags unchanged (COALESCE behaviour). */
  tags?: string[];
  reviewerId?: string;
  /** Set to true to explicitly clear all tags (set to empty array). */
  clearTags?: boolean;
}

/** POST /knowledge/articles/{articleId}/feedback */
export interface CreateFeedbackRequest {
  isHelpful: boolean;
  comment?: string;
}

/** POST /knowledge/announcements */
export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  priority: string;
  targetAudience: string;
  targetIds?: string[];
  expiresAt?: string;
}

/** PUT /knowledge/announcements/{id} */
export interface UpdateAnnouncementRequest {
  title?: string;
  content?: string;
  priority?: string;
  targetAudience?: string;
  targetIds?: string[];
  isActive?: boolean;
  /** ISO-8601 datetime string to set or update the expiry. */
  expiresAt?: string;
  /** Set to true to explicitly clear the expiry date (set to NULL). */
  clearExpiresAt?: boolean;
}
