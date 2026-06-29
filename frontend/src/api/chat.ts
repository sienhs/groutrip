import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type { ChatMessage, ChatRead } from '../types/chat';

export const getChatMessages = async (groupId: number, before?: number): Promise<ChatMessage[]> => {
  const res = await instance.get<ApiResponse<ChatMessage[]>>(`/api/groups/${groupId}/chat/messages`, {
    params: before != null ? { before } : undefined,
  });
  return res.data.data;
};

export const deleteChatMessage = async (groupId: number, messageId: number): Promise<void> => {
  await instance.delete(`/api/groups/${groupId}/chat/messages/${messageId}`);
};

/** 활성 멤버별 마지막으로 읽은 메시지 id 목록(읽음 표시 계산용). */
export const getChatReads = async (groupId: number): Promise<ChatRead[]> => {
  const res = await instance.get<ApiResponse<ChatRead[]>>(`/api/groups/${groupId}/chat/reads`);
  return res.data.data;
};
