import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components/Toast';
import { useNotificationStore } from '../store/notificationStore';
import { EVENT_META, type GroupEvent, type GroupEventType } from '../types/sse';
import { allGroupQueryKeys, invalidationKeysForEvent } from '../queryKeys/groupQueryKeys';
import { getAccessToken } from '../api/instance';
import { useSettingsStore } from '../store/settingsStore';

const WS_URL = (() => {
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  // http(s) → ws(s)
  return base.replace(/^http/, 'ws') + '/ws';
})();

interface Options {
  groupId: number;
  currentUserId: number;
  resolveActorName?: (actorId: number) => string;
  onEvent?: (evt: GroupEvent) => void;
  enabled?: boolean;
}

export function useGroupStream({ groupId, currentUserId, resolveActorName, onEvent, enabled = true }: Options) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const resolveActorNameRef = useRef(resolveActorName);
  const onEventRef = useRef(onEvent);
  const reconnectAttemptsRef = useRef(0);
  useEffect(() => {
    resolveActorNameRef.current = resolveActorName;
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    if (!enabled || !groupId) return;

    const invalidateForEvent = (type: GroupEventType) =>
      invalidationKeysForEvent(type, groupId).forEach((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      );

    const dispatch = (raw: string) => {
      let evt: GroupEvent;
      try {
        evt = JSON.parse(raw) as GroupEvent;
      } catch {
        return;
      }

      onEventRef.current?.(evt);

      if (evt.actorId === currentUserId) {
        invalidateForEvent(evt.type);
        return;
      }

      if (evt.type === 'SETTLEMENT_UPDATED' || evt.type === 'CHAT_MESSAGE') {
        invalidateForEvent(evt.type);
        return;
      }

      const meta = EVENT_META[evt.type];
      if (!meta) return;

      // 이 이벤트에 대한 알림은 백엔드가 이미 DB에 저장했으므로, 벨/목록을 서버와 다시 동기화한다.
      // (인앱 토스트 on/off와 무관하게 다른 기기에서도 보이도록 항상 갱신.)
      useNotificationStore.getState().hydrate();

      if (!useSettingsStore.getState().notificationsEnabled) {
        invalidateForEvent(evt.type);
        return;
      }

      const actor = evt.actorName ?? resolveActorNameRef.current?.(evt.actorId) ?? '멤버';
      const message = `${actor}님이 ${meta.text}`;

      toast.show(meta.toast, message);
      invalidateForEvent(evt.type);
    };

    const client = new Client({
      brokerURL: WS_URL,
      connectHeaders: {
        Authorization: `Bearer ${getAccessToken() ?? ''}`,
      },
      reconnectDelay: 5000,
      onConnect: () => {
        reconnectAttemptsRef.current = 0;
        client.reconnectDelay = 5000;
        client.subscribe(`/topic/group/${groupId}`, (frame) => dispatch(frame.body));
      },
      onWebSocketClose: () => {
        const delay = Math.min(5000 * Math.pow(2, reconnectAttemptsRef.current), 60_000);
        reconnectAttemptsRef.current += 1;
        client.reconnectDelay = delay;
      },
      onStompError: (frame) => {
        console.error('[WS] STOMP error', frame);
        // 전체 무효화로 폴백(데이터 갱신 보장)
        allGroupQueryKeys(groupId).forEach((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        );
      },
    });

    client.activate();
    return () => { client.deactivate(); };
  }, [groupId, currentUserId, enabled, queryClient, toast]);
}
