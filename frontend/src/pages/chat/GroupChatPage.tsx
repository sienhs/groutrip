import { useCallback, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { useQuery } from '@tanstack/react-query';
import { getChatMessages, deleteChatMessage, getChatReads } from '../../api/chat';
import { getAccessToken } from '../../api/instance';
import useAuthStore from '../../store/authStore';
import type { ChatMessage, ChatRead } from '../../types/chat';
import { useToast } from '../../components/Toast';
import { cn } from '../../lib/cn';

const WS_URL = (() => {
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  return base.replace(/^http/, 'ws') + '/ws';
})();

const EMOJI_LIST = [
  '😀','😄','😁','😆','😅','🤣','😂','🙂','😊','😇',
  '😍','🥰','😘','😎','🤩','🥳','😏','😒','😔','😢',
  '😭','😤','😠','🤯','😱','🥺','🙏','👍','👎','👏',
  '🤝','✌️','🤞','💪','🫶','❤️','🧡','💛','💚','💙',
  '💜','🖤','💔','💯','🔥','✨','🎉','🎊','🎁','🍕',
  '🍔','🍣','☕','🍺','🥂','🚀','🌈','⭐','🌙','☀️',
];

interface Props {
  groupId: number;
}

export default function GroupChatPage({ groupId }: Props) {
  const currentUser = useAuthStore((s) => s.user);
  const myId = currentUser?.id;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  // 멤버별 마지막으로 읽은 메시지 id (userId → lastReadMessageId). 메시지별 "안 읽은 인원 수" 계산용.
  const [reads, setReads] = useState<Record<number, number>>({});
  const clientRef = useRef<Client | null>(null);
  const lastSentReadRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  // 내가 messageId까지 읽었음을 서버에 알림(더 최신일 때만). 내 읽음 위치는 낙관적으로 즉시 반영.
  const publishRead = useCallback((messageId: number) => {
    if (!messageId || messageId <= lastSentReadRef.current) return;
    const client = clientRef.current;
    if (!client?.connected) return;
    lastSentReadRef.current = messageId;
    client.publish({
      destination: `/app/groups/${groupId}/chat/read`,
      body: JSON.stringify({ lastReadMessageId: messageId }),
    });
    if (myId != null) {
      setReads((prev) => ({ ...prev, [myId]: Math.max(prev[myId] ?? 0, messageId) }));
    }
  }, [groupId, myId]);

  // 메시지 m의 "안 읽은 인원 수" — 보낸 사람을 제외하고 아직 m을 읽지 않은 활성 멤버 수(카카오톡식).
  const unreadCountFor = (msg: ChatMessage) =>
    Object.entries(reads).filter(
      ([uid, last]) => Number(uid) !== msg.senderId && last < msg.id,
    ).length;

  const toast = useToast();
  const [deletingMsgId, setDeletingMsgId] = useState<number | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  const handleDeleteMessage = async (msgId: number) => {
    setDeletingMsgId(msgId);
    try {
      await deleteChatMessage(groupId, msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      setActiveMenuId(null);
    } catch {
      toast.error('삭제에 실패했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setDeletingMsgId(null);
    }
  };

  const historyQuery = useQuery({
    queryKey: ['chat', groupId, 'history'],
    queryFn: () => getChatMessages(groupId),
    enabled: !!groupId,
  });

  const readsQuery = useQuery({
    queryKey: ['chat', groupId, 'reads'],
    queryFn: () => getChatReads(groupId),
    enabled: !!groupId,
  });

  useEffect(() => {
    if (historyQuery.data) {
      setMessages(historyQuery.data);
    }
  }, [historyQuery.data]);

  useEffect(() => {
    if (readsQuery.data) {
      setReads(Object.fromEntries(readsQuery.data.map((r: ChatRead) => [r.userId, r.lastReadMessageId])));
    }
  }, [readsQuery.data]);

  // 연결됨 + 메시지가 있으면 최신 메시지를 읽음 처리(중복 전송은 publishRead가 차단).
  useEffect(() => {
    if (!connected || messages.length === 0) return;
    publishRead(messages[messages.length - 1].id);
  }, [connected, messages, publishRead]);

  useEffect(() => {
    let attempts = 0;
    lastSentReadRef.current = 0;
    const client = new Client({
      brokerURL: WS_URL,
      connectHeaders: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
      reconnectDelay: 5000,
      onConnect: () => {
        attempts = 0;
        client.reconnectDelay = 5000;
        setConnected(true);
        client.subscribe(`/topic/group/${groupId}/chat`, (frame) => {
          try {
            const msg = JSON.parse(frame.body) as ChatMessage;
            setMessages((prev) => [...prev, msg]);
          } catch {
            // ignore
          }
        });
        // 읽음 이벤트 — 멤버의 읽음 위치 갱신(메시지별 안 읽음 수 실시간 반영).
        client.subscribe(`/topic/group/${groupId}/chat/read`, (frame) => {
          try {
            const r = JSON.parse(frame.body) as ChatRead;
            setReads((prev) => ({ ...prev, [r.userId]: Math.max(prev[r.userId] ?? 0, r.lastReadMessageId) }));
          } catch {
            // ignore
          }
        });
      },
      onWebSocketClose: () => {
        setConnected(false);
        client.reconnectDelay = Math.min(5000 * Math.pow(2, attempts), 60_000);
        attempts += 1;
      },
      onDisconnect: () => setConnected(false),
    });
    clientRef.current = client;
    client.activate();
    return () => { client.deactivate(); };
  }, [groupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 이모지 패널 바깥 클릭 시 닫기
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmoji]);

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (!el) {
      setInput((v) => v + emoji);
      return;
    }
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? input.length;
    const next = input.slice(0, start) + emoji + input.slice(end);
    setInput(next);
    // 커서를 이모지 뒤로 이동
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const send = () => {
    const content = input.trim();
    if (!content || !clientRef.current?.connected) return;
    clientRef.current.publish({
      destination: `/app/groups/${groupId}/chat`,
      body: JSON.stringify({ content }),
    });
    setInput('');
    setShowEmoji(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* 메시지 목록 — min-h-0로 남은 높이만 차지하고 내부 스크롤(입력창은 아래 고정) */}
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {historyQuery.isLoading && (
          <p className="text-center text-[13px] text-muted">불러오는 중...</p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.senderId === currentUser?.id;
          const menuOpen = activeMenuId === msg.id;
          // 연속 메시지 묶기(카카오톡식): 같은 사람 연속이면 이름은 묶음 첫 줄에만,
          // 시간은 같은 분(分) 묶음의 마지막 줄에만 표시한다.
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const minuteOf = (s: string) => Math.floor(new Date(s).getTime() / 60000);
          const firstOfGroup = !prev || prev.senderId !== msg.senderId;
          const lastOfGroup = !next || next.senderId !== msg.senderId || minuteOf(next.createdAt) !== minuteOf(msg.createdAt);
          const showName = !isMe && firstOfGroup;
          return (
            <div key={msg.id} className={cn('flex flex-col', isMe ? 'items-end' : 'items-start', firstOfGroup ? 'mt-3' : 'mt-0.5', i === 0 && 'mt-0')}>
              {showName && (
                <span className="mb-0.5 text-[11px] font-semibold text-muted">{msg.senderName}</span>
              )}
              <button
                type="button"
                onClick={() => isMe && setActiveMenuId(menuOpen ? null : msg.id)}
                className={cn(
                  'max-w-[75%] rounded-[14px] px-3.5 py-2 text-left text-[14px] leading-relaxed',
                  isMe
                    ? 'bg-[#C25478] text-white'
                    : 'bg-surface text-foreground border border-border',
                  isMe && 'cursor-pointer active:opacity-85',
                )}
              >
                {msg.content}
              </button>
              {(() => {
                const unread = unreadCountFor(msg);
                // 시간은 같은 분 연속 묶음의 마지막 줄에만. 안 읽은 인원 수는 항상(있으면) 표시.
                if (!lastOfGroup && unread === 0) return null;
                const time = new Date(msg.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                // 카카오톡식: 안 읽은 인원 수를 말풍선 옆(시간 근처)에 작게. 내 메시지는 시간 왼쪽, 받은 메시지는 오른쪽.
                return (
                  <span className={cn('mt-0.5 flex items-center gap-1', isMe ? 'flex-row' : 'flex-row-reverse')}>
                    {unread > 0 && (
                      <span className="text-[10px] font-bold leading-none text-[#F4B740]">{unread}</span>
                    )}
                    {lastOfGroup && <span className="text-[10px] text-muted">{time}</span>}
                  </span>
                );
              })()}
              {/* 내 메시지 탭 시 삭제 메뉴 */}
              {isMe && menuOpen && (
                <div className="mt-1 flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={deletingMsgId === msg.id}
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="rounded-full border border-[#FECACA] bg-surface px-2.5 py-1 text-[11px] font-bold text-danger disabled:opacity-50"
                  >
                    {deletingMsgId === msg.id ? '삭제 중…' : '삭제'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMenuId(null)}
                    className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-bold text-muted"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 — shrink-0으로 항상 하단에 고정(메시지 증가에 밀리지 않음) */}
      <div className="relative shrink-0 border-t border-border bg-background px-3 pb-4 pt-2">
        {/* 이모지 피커 */}
        {showEmoji && (
          <div
            ref={emojiRef}
            className="absolute bottom-full left-3 mb-2 grid w-72 grid-cols-10 gap-0.5 rounded-[14px] border border-border bg-surface p-2 shadow-lg"
          >
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="flex size-[26px] items-center justify-center rounded-md text-[18px] hover:bg-background"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {!connected && (
          <p className="mb-1.5 text-center text-[11px] text-muted">연결 중...</p>
        )}
        <div className="flex items-center gap-2">
          {/* 이모지 버튼 */}
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-[20px] transition-colors',
              showEmoji && 'border-[#C25478] bg-[#FCF0F9]',
            )}
            aria-label="이모지"
          >
            😊
          </button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="메시지를 입력하세요"
            maxLength={1000}
            className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-[14px] outline-none focus:border-[#C25478]"
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || !connected}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#C25478] text-white disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
