import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { useQuery } from '@tanstack/react-query';
import { getChatMessages, deleteChatMessage } from '../../api/chat';
import { getAccessToken } from '../../api/instance';
import useAuthStore from '../../store/authStore';
import type { ChatMessage } from '../../types/chat';
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (historyQuery.data) {
      setMessages(historyQuery.data);
    }
  }, [historyQuery.data]);

  useEffect(() => {
    let attempts = 0;
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
    <div className="flex h-full flex-col">
      {/* 메시지 목록 */}
      <div className="scrollbar-hide flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {historyQuery.isLoading && (
          <p className="text-center text-[13px] text-muted">불러오는 중...</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser?.id;
          const menuOpen = activeMenuId === msg.id;
          return (
            <div key={msg.id} className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}>
              {!isMe && (
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
              <span className="mt-0.5 text-[10px] text-muted">
                {new Date(msg.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
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

      {/* 입력창 */}
      <div className="relative border-t border-border bg-background px-3 pb-4 pt-2">
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
