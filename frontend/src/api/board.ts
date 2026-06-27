import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type { PostSummary, PostDetail, CommentItem } from '../types/board';

export const getPosts = async (groupId: number): Promise<PostSummary[]> => {
  const res = await instance.get<ApiResponse<PostSummary[]>>(`/api/groups/${groupId}/posts`);
  return res.data.data;
};

export const getPost = async (groupId: number, postId: number): Promise<PostDetail> => {
  const res = await instance.get<ApiResponse<PostDetail>>(`/api/groups/${groupId}/posts/${postId}`);
  return res.data.data;
};

export const createPost = async (groupId: number, title: string, content: string, isNotice = false): Promise<PostDetail> => {
  const res = await instance.post<ApiResponse<PostDetail>>(`/api/groups/${groupId}/posts`, { title, content, isNotice });
  return res.data.data;
};

export const updatePost = async (groupId: number, postId: number, title: string, content: string, isNotice = false): Promise<PostDetail> => {
  const res = await instance.put<ApiResponse<PostDetail>>(`/api/groups/${groupId}/posts/${postId}`, { title, content, isNotice });
  return res.data.data;
};

export const deletePost = async (groupId: number, postId: number): Promise<void> => {
  await instance.delete(`/api/groups/${groupId}/posts/${postId}`);
};

export const createComment = async (groupId: number, postId: number, content: string): Promise<CommentItem> => {
  const res = await instance.post<ApiResponse<CommentItem>>(`/api/groups/${groupId}/posts/${postId}/comments`, { content });
  return res.data.data;
};

export const deleteComment = async (groupId: number, postId: number, commentId: number): Promise<void> => {
  await instance.delete(`/api/groups/${groupId}/posts/${postId}/comments/${commentId}`);
};
