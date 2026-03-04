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
