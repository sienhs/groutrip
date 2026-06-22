import type { GroupEventType } from './realtime';

export interface NotificationResponse {
  id: number;
  groupId: number;
  type: GroupEventType;
  message: string;
  targetPath: string;
  readAt: string | null;
  createdAt: string;
}
