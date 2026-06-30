import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../../components/AppLayout';
import { useToast } from '../../components/Toast';
import useAuthStore from '../../store/authStore';
import { getGroup, getGroupMembers, clearPinnedNotice } from '../../api/group';
import { groupQueryKeys } from '../../queryKeys/groupQueryKeys';
import GroupChatPage from './GroupChatPage';
import GroupGalleryPage from '../gallery/GroupGalleryPage';
import GroupBoardPage from '../board/GroupBoardPage';
import { cn } from '../../lib/cn';

type Panel = 'chat' | 'gallery' | 'board' | 'members';

/**
 * 카카오톡식 채팅 허브 — 채팅이 메인, 우상단 ☰ 메뉴(서랍)로 사진앨범·게시판·멤버를 연다.
 * 상단에는 방장이 고정한 공지(게시판 글 또는 진행중 투표)를 배너로 보여주고, 누르면 해당 화면으로 이동한다.
 */
export default function GroupChatRoomPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [panel, setPanel] = useState<Panel>('chat');
  const [drawerOpen, setDrawerOpen] = useState(false);
  // 게시판 패널 진입 시 바로 열 글 id(상단 고정 공지 클릭). 목록부터면 null.
  const [boardPostId, setBoardPostId] = useState<number | null>(null);

  const { data: group } = useQuery({
    queryKey: groupQueryKeys.detail(groupId),
    queryFn: () => getGroup(groupId),
    enabled: Number.isFinite(groupId),
  });

  const { data: members = [] } = useQuery({
    queryKey: groupQueryKeys.members(groupId),
    queryFn: () => getGroupMembers(groupId),
    enabled: Number.isFinite(groupId),
  });

  const currentUserId = currentUser?.id ?? 0;
  const isOwner = members.find((m) => m.userId === currentUserId)?.role === 'OWNER';

  // 초대 링크 공유 — Web Share API 우선, 미지원 시 클립보드.
  const shareInvite = async () => {
    const code = group?.inviteCode;
    if (!code) {
      toast.info('초대', '초대 코드를 불러오는 중이에요.');
      return;
    }
    const link = `${window.location.origin}/join/${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${group?.title ?? '여행'} 그룹 초대`, text: '함께 여행 계획을 만들어요!', url: link });
        return;
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      toast.success('초대 링크를 복사했어요', '링크를 공유하면 바로 참여할 수 있어요.');
    } catch {
      toast.info('초대 링크', link);
    }
  };

  const handleUnpin = async () => {
    try {
      await clearPinnedNotice(groupId);
      await queryClient.invalidateQueries({ queryKey: groupQueryKeys.detail(groupId) });
      toast.success('공지 고정을 해제했어요', '');
    } catch {
      toast.error('해제하지 못했어요', '잠시 후 다시 시도해 주세요.');
    }
  };

  const handlePinnedClick = () => {
    if (!group?.pinnedType) return;
    if (group.pinnedType === 'VOTE' && group.pinnedRefId) {
      navigate(`/groups/${groupId}/votes/${group.pinnedRefId}`);
    } else if (group.pinnedType === 'POST') {
      setBoardPostId(group.pinnedRefId ?? null); // 해당 공지글 상세로 바로 진입
      setPanel('board');
    }
  };

  const openPanel = (p: Panel) => {
    if (p === 'board') setBoardPostId(null); // 메뉴에서 들어오면 목록부터
    setPanel(p);
    setDrawerOpen(false);
  };

  const title = group?.title ?? '채팅';

  return (
    <AppLayout bleed hideBottomNav hideHeader>
      {/* 데스크톱: 넓은 화면에서 채팅이 끝까지 늘어나지 않도록 가운데 정렬된 패널로 프레임(가독성).
          모바일: 기존처럼 화면을 꽉 채운다. */}
      <div className="flex h-full min-h-0 flex-1 flex-col md:items-center md:bg-[#F1EFF8]">
      <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-background md:max-w-3xl md:border-x md:border-border md:shadow-lg">
        {panel === 'chat' ? (
          <>
            {/* 헤더 */}
            <header className="flex shrink-0 items-center gap-1 border-b border-border bg-surface px-2 py-2.5">
              <button type="button" aria-label="뒤로" onClick={() => navigate(-1)} className="flex size-9 items-center justify-center rounded-lg text-foreground">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <h1 className="min-w-0 flex-1 truncate text-[16px] font-extrabold">{title}</h1>
              <button type="button" aria-label="메뉴" onClick={() => setDrawerOpen(true)} className="flex size-9 items-center justify-center rounded-lg text-foreground">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </header>

            {/* 고정 공지 배너 */}
            {group?.pinnedType && (
              <div className="flex shrink-0 items-center gap-2 border-b border-border bg-[#FCF7EC] px-3 py-2">
                <span className="text-[14px]">📌</span>
                <button type="button" onClick={handlePinnedClick} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                  <span className="shrink-0 rounded-full bg-[#F4B740]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#B8860B]">
                    {group.pinnedType === 'VOTE' ? '투표' : '공지'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{group.pinnedTitle}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-muted"><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                {isOwner && (
                  <button type="button" aria-label="고정 해제" onClick={handleUnpin} className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-black/5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  </button>
                )}
              </div>
            )}

            {/* 채팅 */}
            <GroupChatPage groupId={groupId} />
          </>
        ) : (
          // 사진/게시판/멤버 패널 — 자체 헤더(← 채팅으로)
          <>
            <header className="flex shrink-0 items-center gap-1 border-b border-border bg-surface px-2 py-2.5">
              <button type="button" aria-label="채팅으로" onClick={() => setPanel('chat')} className="flex size-9 items-center justify-center rounded-lg text-foreground">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <h1 className="min-w-0 flex-1 truncate text-[16px] font-extrabold">
                {panel === 'gallery' ? '사진 앨범' : panel === 'board' ? '게시판' : '멤버'}
              </h1>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {panel === 'gallery' && <GroupGalleryPage groupId={groupId} currentUserId={currentUserId} isOwner={isOwner} />}
              {panel === 'board' && <GroupBoardPage key={`board-${boardPostId ?? 'list'}`} groupId={groupId} currentUserId={currentUserId} isOwner={isOwner} initialPostId={boardPostId} />}
              {panel === 'members' && (
                <MembersPanel members={members} currentUserId={currentUserId} inviteCode={group?.inviteCode ?? ''} onShare={shareInvite} />
              )}
            </div>
          </>
        )}
      </div>
      </div>

      {/* 우측 서랍 메뉴 */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          <div className="flex-1 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="flex w-64 max-w-[80%] flex-col bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="truncate text-[15px] font-extrabold">{title}</span>
              <button type="button" aria-label="닫기" onClick={() => setDrawerOpen(false)} className="flex size-8 items-center justify-center rounded-lg text-muted">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>
            <nav className="flex flex-col gap-0.5 p-2">
              <DrawerItem label="사진 앨범" onClick={() => openPanel('gallery')} icon={<path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm3 11 4-5 3 4 2-2 4 3" />} />
              <DrawerItem label="게시판" onClick={() => openPanel('board')} icon={<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />} />
              <DrawerItem label="멤버" onClick={() => openPanel('members')} icon={<><circle cx="9" cy="8" r="3" /><path d="M3.5 19c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5" /><path d="M16 11a3 3 0 0 0 0-6" /></>} />
              <div className="my-1 h-px bg-border" />
              <DrawerItem label="초대 링크 공유" onClick={() => { setDrawerOpen(false); shareInvite(); }} icon={<><circle cx="18" cy="5" r="2.4" /><circle cx="6" cy="12" r="2.4" /><circle cx="18" cy="19" r="2.4" /><path d="m8.1 13.2 7.8 4.6M15.9 6.2 8.1 10.8" /></>} />
            </nav>
          </aside>
        </div>
      )}
    </AppLayout>
  );
}

function DrawerItem({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-button px-3 py-2.5 text-left text-[15px] font-bold text-foreground hover:bg-border/40">
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-muted">
        {icon}
      </svg>
      {label}
    </button>
  );
}

interface MembersPanelProps {
  members: { userId: number; name: string; role: string }[];
  currentUserId: number;
  inviteCode: string;
  onShare: () => void;
}

function MembersPanel({ members, currentUserId, inviteCode, onShare }: MembersPanelProps) {
  return (
    <div className="space-y-4">
      {/* 초대 — 잘 보이도록 상단에 큰 버튼 */}
      <div className="rounded-card border border-border bg-surface p-4">
        <p className="text-[13px] font-bold text-foreground">친구 초대</p>
        <p className="mt-0.5 text-[12px] text-muted">링크를 공유하면 바로 그룹에 참여할 수 있어요.</p>
        <button
          type="button"
          onClick={onShare}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E86A92] to-[#C25478] py-3 text-[15px] font-extrabold text-white shadow-md shadow-[#C25478]/30 active:scale-[.98]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="18" cy="5" r="2.4" /><circle cx="6" cy="12" r="2.4" /><circle cx="18" cy="19" r="2.4" /><path d="m8.1 13.2 7.8 4.6M15.9 6.2 8.1 10.8" />
          </svg>
          초대 링크 공유하기
        </button>
        {inviteCode && (
          <p className="mt-2 text-center text-[12px] text-muted">초대 코드 <span className="font-bold tracking-widest text-foreground">{inviteCode}</span></p>
        )}
      </div>

      {/* 멤버 목록 */}
      <div>
        <p className="mb-2 text-[13px] font-extrabold tracking-wide text-muted">멤버 {members.length}명</p>
        <ul className="space-y-1.5">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 rounded-button bg-surface px-3 py-2.5">
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white', m.role === 'OWNER' ? 'bg-[#C25478]' : 'bg-[#A99FBF]')}>
                {m.name.charAt(0)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-foreground">
                {m.name}{m.userId === currentUserId && <span className="text-muted"> (나)</span>}
              </span>
              {m.role === 'OWNER' && <span className="shrink-0 rounded-full bg-[#FCF0F9] px-2 py-0.5 text-[11px] font-bold text-[#C25478]">방장</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
