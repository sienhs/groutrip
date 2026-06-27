import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type { ChatMessage } from '../types/chat';

export const getChatMessages = async (groupId: number, before?: number): Promise<ChatMessage[]> => {
  const res = await instance.get<ApiResponse<ChatMessage[]>>(`/api/groups/${groupId}/chat/messages`, {
    params: before != null ? { before } : undefined,
  });
  return res.data.data;
};
