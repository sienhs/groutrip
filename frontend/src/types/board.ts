export interface PostSummary {
  id: number;
  authorId: number;
  authorName: string;
  title: string;
  content: null;
  commentCount: number;
  isNotice: boolean;
  createdAt: string;
  updatedAt: string;
  comments: null;
}

export interface CommentItem {
  id: number;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface PostDetail {
  id: number;
  authorId: number;
  authorName: string;
  title: string;
  content: string;
  commentCount: number;
  isNotice: boolean;
  createdAt: string;
  updatedAt: string;
  comments: CommentItem[];
}
