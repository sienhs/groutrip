export interface ChatMessage {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  createdAt: string;
}

/** 멤버 1명의 읽음 위치. 메시지별 "안 읽은 인원 수" 계산에 사용. */
export interface ChatRead {
  userId: number;
  lastReadMessageId: number;
}
