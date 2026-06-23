import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Tabs, { type TabItem } from '../../components/Tabs';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import { useToast } from '../../components/Toast';
import NotificationBell from '../../components/NotificationBell';
import BookmarkListPage from '../place/BookmarkListPage';
import ExpensePage from '../expense/ExpensePage';
import ScheduleBuilderPage from '../schedule/ScheduleBuilderPage';
import { getGroup, getGroupMembers } from '../../api/group';
import { useGroupStream } from '../../hooks/useGroupStream';
import useAuthStore from '../../store/authStore';
import { gradientForKey, ddayLabel, dateRange } from './groupUi';
import { cn } from '../../lib/cn';
import { type GroupMember, type TravelGroup } from '../../types/group';

type TabKey = 'schedule' | 'place' | 'vote' | 'settle' | 'member';

const TABS: TabItem[] = [
  { key: 'schedule', label: '일정' },
  { key: 'place', label: '장소' },
  { key: 'vote', label: '투표' },
  { key: 'settle', label: '정산' },
  { key: 'member', label: '멤버' },
];

/**
 * 그룹 허브(GroupDetailPage). 커버 배너 + 탭(일정/장소/투표/정산/멤버).
 * '장소' 탭은 완성된 보관함 화면(BookmarkListPage)을 그대로 임베드.
 * 일정/투표/정산은 각 Phase 진행 시 실제 화면으로 교체(현재 준비 중 안내).
 */
export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const groupId = Number(params.id);
  const navigate = useNavigate();
  const toast = useToast();

  const [group, setGroup] = useState<TravelGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<TabKey>('place');

  // ⚠️ 본인 이벤트 무시용 userId. 현재 User 타입엔 id 가 없음(name/email 뿐) →
  //    백엔드가 User 에 userId 를 노출하면 그 필드로 교체. 그전엔 -1(자기무시 비활성).
  const authUser = useAuthStore((s) => s.user);
  const currentUserId = (authUser as { id?: number } | null)?.id ?? -1;

  useEffect(() => {
    (async () => {
      try {
        const [g, ms] = await Promise.all([getGroup(groupId), getGroupMembers(groupId)]);
        setGroup(g);
        setMembers(ms);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

  // 실시간 구독(SSE): ⚠️ /stream 은 Part B 미구현 → 지금은 비활성. Part B 완료 시 enabled: !!group 로.
  //   그전에는 탭 진입 시 각 화면의 refetch 로 최신화한다.
  useGroupStream({
    groupId,
    currentUserId,
    enabled: false,
    resolveActorName: (actorId) => members.find((m) => m.userId === actorId)?.name ?? '멤버',
  });

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md items-center justify-center bg-background px-6">
        <EmptyState
          title="그룹을 불러오지 못했어요"
          description="삭제되었거나 접근 권한이 없을 수 있어요."
          action={<Button variant="secondary" onClick={() => navigate('/groups')}>내 그룹으로</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background md:max-w-lg">
      {/* 배너 */}
      <div className={cn('relative h-[150px]', group ? gradientForKey(group.coverImageKey) : 'bg-[#F0E4D6]')}>
        <button
          type="button"
          aria-label="뒤로가기"
          onClick={() => navigate(-1)}
          className="absolute left-3 top-3 flex size-9 items-center justify-center rounded-[10px] bg-white/25 text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="공유"
          onClick={() => toast.info('초대 공유', group?.inviteCode ? `코드 ${group.inviteCode}` : '초대 링크를 복사했어요.')}
          className="absolute right-14 top-3 flex size-9 items-center justify-center rounded-[10px] bg-white/25 text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="18" cy="5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="6" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="18" cy="19" r="2.4" stroke="currentColor" strokeWidth="1.8" />
            <path d="m8 11 8-5M8 13l8 5" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
        <div className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-[10px] bg-white/25 text-white [&_svg]:stroke-white [&_button]:text-white">
          <NotificationBell />
        </div>
        {group && (
          <div className="absolute inset-x-4 bottom-3.5 text-white">
            <span className="rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-extrabold">
              {ddayLabel(group.startDate, group.endDate)}
            </span>
            <h1 className="mt-2 text-[22px] font-extrabold tracking-tight">{group.title}</h1>
            <p className="text-[13px] opacity-90">
              {group.destination} · {dateRange(group.startDate, group.endDate)} · 멤버 {members.length}명
            </p>
          </div>
        )}
      </div>

      {/* 여행 계획 시작 — 목적지 정하기 → 숙소 선정/예약 플로우로 이동 */}
      <button
        type="button"
        onClick={() => navigate(`/groups/${groupId}/plan`)}
        className="flex w-full items-center justify-between gap-2 border-b border-border bg-[#FFF7F0] px-4 py-3 text-left active:bg-[#FFEEDF]"
      >
        <span className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-[9px] bg-[#FFE3CC] text-[#E8742E]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 21s-7-5.2-7-10.5A7 7 0 0 1 19 10.5C19 15.8 12 21 12 21Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="12" cy="10.5" r="2.2" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </span>
          <span>
            <span className="block text-[14px] font-extrabold text-[#3A322B]">여행 계획 시작</span>
            <span className="block text-[12px] text-muted">목적지 정하기 · 숙소 선정/예약</span>
          </span>
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M9 6l6 6-6 6" stroke="#E8742E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* 탭 */}
      <div className="sticky top-0 z-20 bg-surface">
        <Tabs items={TABS} value={tab} onChange={(k) => setTab(k as TabKey)} />
      </div>

      {/* 탭 콘텐츠 */}
      <div className="px-4 py-4">
        {loading ? (
          <p className="py-10 text-center text-[13px] text-muted">불러오는 중…</p>
        ) : tab === 'schedule' ? (
          <ScheduleBuilderPage groupId={groupId} />
        ) : tab === 'place' ? (
          <BookmarkListPage groupId={groupId} />
        ) : tab === 'settle' ? (
          <ExpensePage groupId={groupId} members={members} />
        ) : tab === 'member' ? (
          <MemberTab members={members} onInvite={() => toast.info('초대', '초대 링크·코드를 공유하세요.')} />
        ) : (
          <ComingSoon />
        )}
      </div>
    </div>
  );
}

function MemberTab({ members, onInvite }: { members: GroupMember[]; onInvite: () => void }) {
  const active = members; // /members 는 활성 멤버만 반환
  return (
    <div>
      <button
        type="button"
        onClick={onInvite}
        className="mb-3.5 flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#FFCBA6] bg-[#FFF7F0] py-3 text-[14px] font-bold text-[#E8742E]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M18 8v6M21 11h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        초대 링크 · 코드 공유
      </button>

      {active.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted">멤버 정보를 불러오는 중이에요.</p>
      ) : (
        <div className="space-y-2.5">
          {active.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 rounded-card border border-border bg-surface px-3.5 py-3">
              <Avatar name={m.name} size="lg" />
              <div className="flex-1">
                <div className="text-[15px] font-extrabold">{m.name}</div>
                <div className="text-[12px] text-muted">
                  {m.role === 'OWNER' ? '그룹 생성' : `${m.joinedAt.slice(5, 10).replace('-', '.')} 참여`}
                </div>
              </div>
              {m.role === 'OWNER' && <Badge tone="primary">OWNER</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ComingSoon() {
  return (
    <EmptyState
      title="투표 준비 중"
      description="장소·일정안 투표 기능이 곧 추가됩니다."
      icon={
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="#FFB585" strokeWidth="2" />
          <path d="M12 7v5l3 2" stroke="#FFB585" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
    />
  );
}
