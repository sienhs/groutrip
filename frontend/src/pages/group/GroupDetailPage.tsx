import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Tabs, { type TabItem } from '../../components/Tabs';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import { useToast } from '../../components/Toast';
import { ConfirmModal } from '../../components/Modal';
import NotificationBell from '../../components/NotificationBell';
import BookmarkListPage from '../place/BookmarkListPage';
import ExpensePage from '../expense/ExpensePage';
import ScheduleBuilderPage from '../schedule/ScheduleBuilderPage';
import VoteTab from '../vote/VoteTab';
import GroupEditModal from './GroupEditModal';
import {
  getGroup,
  getGroupMembers,
  leaveGroup,
  kickMember,
  transferOwner,
  dissolveGroup,
  regenerateInviteCode,
} from '../../api/group';
import { getAccommodations } from '../../api/accommodation';
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
 * 일정·장소·정산은 실제 화면(ScheduleBuilderPage/BookmarkListPage/ExpensePage)을 임베드,
 * 투표 탭만 아직 준비 중(ComingSoon). 그룹 SSE를 구독해 다른 멤버 변경을 실시간 반영한다.
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
  // 그룹에 숙소 선정/예약(=여행 계획)이 하나라도 있으면 true. 진입 CTA 노출을 가른다.
  const [planExists, setPlanExists] = useState(false);
  // 다른 멤버의 SSE 이벤트 수신 시 증가 → 활성 탭을 remount해 실제 refetch한다.
  const [streamTick, setStreamTick] = useState(0);
  const [editOpen, setEditOpen] = useState(false);

  // 본인 이벤트 무시용 userId. 로그인 시 user.id = userId 로 저장됨(authStore).
  const currentUserId = useAuthStore((s) => s.user?.id ?? -1);

  useEffect(() => {
    (async () => {
      try {
        const [g, ms] = await Promise.all([getGroup(groupId), getGroupMembers(groupId)]);
        setGroup(g);
        setMembers(ms);
        // 여행 계획 존재 여부는 그룹 로딩과 분리해, 실패해도 화면이 깨지지 않게 한다.
        try {
          const accs = await getAccommodations(groupId);
          setPlanExists(accs.length > 0);
        } catch {
          /* 계획 조회 실패는 무시(없음으로 간주) */
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

  // 실시간 구독(SSE): /api/groups/{id}/stream (Part B 구현 완료). 그룹 로딩되면 연결.
  //   콜백/리졸버는 안정 참조(useCallback)로 넘겨 렌더마다 재연결되는 것을 막는다.
  const resolveActorName = useCallback(
    (actorId: number) => members.find((m) => m.userId === actorId)?.name ?? '멤버',
    [members],
  );
  const handleStreamEvent = useCallback(() => setStreamTick((t) => t + 1), []);
  useGroupStream({
    groupId,
    currentUserId,
    enabled: !!group,
    resolveActorName,
    onEvent: handleStreamEvent,
  });

  // 초대 코드를 실제로 클립보드에 복사한다(복사 실패 시 코드 노출로 폴백).
  const copyInvite = useCallback(async () => {
    const code = group?.inviteCode;
    if (!code) {
      toast.info('초대', '초대 코드를 불러오는 중이에요.');
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      toast.success('초대 코드를 복사했어요', `코드 ${code}`);
    } catch {
      toast.info('초대 코드', `코드 ${code}`);
    }
  }, [group?.inviteCode, toast]);

  // 멤버 변경(강퇴/위임/코드 재발급) 후 그룹·멤버를 다시 불러온다.
  const refreshGroupAndMembers = useCallback(async () => {
    const [g, ms] = await Promise.all([getGroup(groupId), getGroupMembers(groupId)]);
    setGroup(g);
    setMembers(ms);
  }, [groupId]);

  const isOwner = members.find((m) => m.userId === currentUserId)?.role === 'OWNER';

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
        {/* FR-GROUP-04: Owner만 그룹 정보 수정 */}
        {isOwner && group && (
          <button
            type="button"
            aria-label="그룹 정보 수정"
            onClick={() => setEditOpen(true)}
            className="absolute left-14 top-3 flex size-9 items-center justify-center rounded-[10px] bg-white/25 text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L4 18v2Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
              <path d="m13.5 7 3 3" stroke="currentColor" strokeWidth="1.9" />
            </svg>
          </button>
        )}
        <button
          type="button"
          aria-label="공유"
          onClick={copyInvite}
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

      {/* 여행 계획이 없을 때만: 눈에 띄는 시작 CTA. 계획이 있으면 '장소' 탭의 장소 추가로 합친다. */}
      {!loading && !planExists && (
        <button
          type="button"
          onClick={() => navigate(`/groups/${groupId}/plan`)}
          className="flex w-full items-center gap-3 border-b border-border bg-gradient-to-r from-[#FF9F66] to-[#FF8A4C] px-4 py-4 text-left text-white shadow-sm active:opacity-95"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-white/25">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 21s-7-5.2-7-10.5A7 7 0 0 1 19 10.5C19 15.8 12 21 12 21Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
              <circle cx="12" cy="10.5" r="2.3" stroke="currentColor" strokeWidth="1.9" />
            </svg>
          </span>
          <span className="flex-1">
            <span className="block text-[16px] font-extrabold">여행 계획 시작하기</span>
            <span className="block text-[12.5px] text-white/90">목적지·숙소를 정하고 함께 갈 곳을 모아요</span>
          </span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {/* 탭 */}
      <div className="sticky top-0 z-20 bg-surface">
        <Tabs items={TABS} value={tab} onChange={(k) => setTab(k as TabKey)} />
      </div>

      {/* 탭 콘텐츠 */}
      <div className="px-4 py-4">
        {loading ? (
          <p className="py-10 text-center text-[13px] text-muted">불러오는 중…</p>
        ) : tab === 'schedule' ? (
          <ScheduleBuilderPage key={streamTick} groupId={groupId} isOwner={isOwner} />
        ) : tab === 'place' ? (
          <BookmarkListPage key={streamTick} groupId={groupId} planExists={planExists} />
        ) : tab === 'vote' ? (
          <VoteTab key={streamTick} groupId={groupId} isOwner={isOwner} />
        ) : tab === 'settle' ? (
          <ExpensePage key={streamTick} groupId={groupId} members={members} />
        ) : tab === 'member' ? (
          <MemberTab
            groupId={groupId}
            members={members}
            currentUserId={currentUserId}
            isOwner={isOwner}
            inviteCode={group?.inviteCode ?? ''}
            onCopyInvite={copyInvite}
            onRefresh={refreshGroupAndMembers}
            onExit={() => navigate('/groups')}
          />
        ) : null}
      </div>

      {editOpen && group && (
        <GroupEditModal
          group={group}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => setGroup(updated)}
        />
      )}
    </div>
  );
}

interface MemberTabProps {
  groupId: number;
  members: GroupMember[];
  currentUserId: number;
  isOwner: boolean;
  inviteCode: string;
  onCopyInvite: () => void;
  onRefresh: () => Promise<void>;
  onExit: () => void;
}

/** 멤버 관리(FR-GROUP-05~07): 초대 코드 공유/재발급, 강퇴·Owner 위임, 그룹 떠나기/해체. */
function MemberTab({
  groupId,
  members,
  currentUserId,
  isOwner,
  inviteCode,
  onCopyInvite,
  onRefresh,
  onExit,
}: MemberTabProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  // 확인이 필요한 위험 액션
  const [confirm, setConfirm] = useState<
    | { kind: 'kick' | 'transfer'; member: GroupMember }
    | { kind: 'leave' | 'dissolve' | 'regenerate' }
    | null
  >(null);

  const run = async (fn: () => Promise<void>, ok: string, after: 'refresh' | 'exit') => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setConfirm(null);
      if (after === 'exit') onExit();
      else await onRefresh();
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error('처리하지 못했어요', message ?? '권한이 없거나 일시적 오류일 수 있어요.');
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = () => {
    if (!confirm) return;
    switch (confirm.kind) {
      case 'kick':
        return run(() => kickMember(groupId, confirm.member.userId), '멤버를 내보냈어요', 'refresh');
      case 'transfer':
        return run(() => transferOwner(groupId, confirm.member.userId), 'Owner 권한을 넘겼어요', 'refresh');
      case 'leave':
        return run(() => leaveGroup(groupId), '그룹에서 나왔어요', 'exit');
      case 'dissolve':
        return run(() => dissolveGroup(groupId), '그룹을 해체했어요', 'exit');
      case 'regenerate':
        return run(async () => {
          await regenerateInviteCode(groupId);
        }, '새 초대 코드를 발급했어요', 'refresh');
    }
  };

  return (
    <div>
      {/* 초대 코드 */}
      <div className="mb-3.5 rounded-card border border-border bg-surface p-3.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] text-muted">초대 코드</div>
            <div className="text-[18px] font-extrabold tracking-[0.15em] text-[#3A322B]">{inviteCode || '------'}</div>
          </div>
          <Button size="sm" variant="secondary" onClick={onCopyInvite}>코드 복사</Button>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => setConfirm({ kind: 'regenerate' })}
            className="mt-2.5 text-[12px] font-semibold text-[#A6907B] underline-offset-2 hover:underline"
          >
            초대 코드 재발급(기존 코드 무효화)
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted">멤버 정보를 불러오는 중이에요.</p>
      ) : (
        <div className="space-y-2.5">
          {members.map((m) => {
            const isMe = m.userId === currentUserId;
            return (
              <div key={m.userId} className="flex items-center gap-3 rounded-card border border-border bg-surface px-3.5 py-3">
                <Avatar name={m.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[15px] font-extrabold">
                    <span className="truncate">{m.name}</span>
                    {isMe && <span className="shrink-0 text-[11px] font-bold text-[#A6907B]">(나)</span>}
                  </div>
                  <div className="text-[12px] text-muted">
                    {m.role === 'OWNER' ? '그룹 생성' : `${m.joinedAt.slice(5, 10).replace('-', '.')} 참여`}
                  </div>
                </div>
                {m.role === 'OWNER' && <Badge tone="primary">OWNER</Badge>}
                {/* Owner가 다른 멤버를 관리 */}
                {isOwner && !isMe && m.role !== 'OWNER' && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setConfirm({ kind: 'transfer', member: m })}
                      className="rounded-button px-2 py-1 text-[12px] font-bold text-[#E8742E] hover:bg-[#FFF1E6]"
                    >
                      위임
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirm({ kind: 'kick', member: m })}
                      className="rounded-button px-2 py-1 text-[12px] font-bold text-danger hover:bg-[#FEE2E2]"
                    >
                      강퇴
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 떠나기 / 해체 */}
      <div className="mt-5 space-y-2">
        {isOwner ? (
          <>
            <p className="text-[12px] text-muted">
              Owner는 바로 나갈 수 없어요. 다른 멤버에게 위임하거나 그룹을 해체해 주세요.
            </p>
            <Button variant="danger" fullWidth onClick={() => setConfirm({ kind: 'dissolve' })}>
              그룹 해체
            </Button>
          </>
        ) : (
          <Button variant="ghost" fullWidth className="border border-border" onClick={() => setConfirm({ kind: 'leave' })}>
            그룹 떠나기
          </Button>
        )}
      </div>

      <ConfirmModal
        open={!!confirm}
        onClose={() => !busy && setConfirm(null)}
        onConfirm={onConfirm}
        loading={busy}
        danger={confirm?.kind === 'kick' || confirm?.kind === 'dissolve' || confirm?.kind === 'leave'}
        title={
          confirm?.kind === 'kick'
            ? `${confirm.member.name}님을 내보낼까요?`
            : confirm?.kind === 'transfer'
              ? `${confirm.member.name}님께 Owner를 넘길까요?`
              : confirm?.kind === 'leave'
                ? '그룹에서 나갈까요?'
                : confirm?.kind === 'dissolve'
                  ? '그룹을 해체할까요?'
                  : '초대 코드를 재발급할까요?'
        }
        description={
          confirm?.kind === 'dissolve'
            ? '모든 멤버에게서 그룹이 사라지며 30일 후 완전 삭제됩니다.'
            : confirm?.kind === 'transfer'
              ? '권한을 넘기면 나는 일반 멤버가 됩니다.'
              : confirm?.kind === 'regenerate'
                ? '기존 초대 코드는 즉시 사용할 수 없게 됩니다.'
                : undefined
        }
        confirmText={
          confirm?.kind === 'kick'
            ? '강퇴'
            : confirm?.kind === 'dissolve'
              ? '해체'
              : confirm?.kind === 'leave'
                ? '나가기'
                : confirm?.kind === 'transfer'
                  ? '위임'
                  : '재발급'
        }
      />
    </div>
  );
}

