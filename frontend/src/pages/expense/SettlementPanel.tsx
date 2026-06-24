import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';
import {
  getSettlementProgress,
  startSettlement,
  confirmSent,
  confirmReceived,
} from '../../api/settlement';
import { groupQueryKeys } from '../../queryKeys/groupQueryKeys';
import { formatWon } from '../../types/expense';
import type { SettlementProgress, SettlementRecord, SettlementStatus } from '../../types/settlement';

interface FallbackTransfer {
  fromName: string;
  toName: string;
  amount: number;
}

function apiMessage(err: unknown): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '';
}

const STATUS: Record<SettlementStatus, { label: string; cls: string }> = {
  PENDING: { label: '대기', cls: 'bg-[#FFF1E6] text-[#E8742E]' },
  SENT: { label: '송금됨', cls: 'bg-[#EAF2FF] text-[#3182F6]' },
  COMPLETED: { label: '완료', cls: 'bg-[#EAF9EF] text-success' },
};

function FromTo({ from, to, amount }: { from: string; to: string; amount: number }) {
  return (
    <div className="flex items-center gap-2 text-[14px] font-bold">
      <span>{from}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 12h14M13 6l6 6-6 6" stroke="#A6907B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{to}</span>
      <span className="ml-auto font-extrabold text-[#E8742E]">{formatWon(amount)}</span>
    </div>
  );
}

/**
 * FR-EXPENSE-05/06 정산 워크플로우.
 * - 미시작: 최소 송금 계산 결과 + "정산 시작하기"
 * - 진행 중: 송금별 상태 + 내 송금엔 "송금 완료", 내 수취엔 "수령 확인"
 * 진행 상태는 React Query(지출 키 하위)로 관리 → SETTLEMENT_UPDATED SSE 무효화 시 모든 멤버 화면이 갱신된다.
 */
export default function SettlementPanel({
  groupId,
  currentUserId,
  fallback,
  onChanged,
}: {
  groupId: number;
  currentUserId: number;
  fallback: FallbackTransfer[];
  /** 정산 상태 변화 시 부모(지출 요약) 갱신용 */
  onChanged?: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<number | 'start' | null>(null);

  // 지출 키 하위로 두어 EXPENSE_*/SETTLEMENT_UPDATED 무효화 시 함께 refetch된다.
  const settlementKey = [...groupQueryKeys.expenses(groupId), 'settlement'] as const;
  const settlementQuery = useQuery({
    queryKey: settlementKey,
    queryFn: async (): Promise<{ started: boolean; progress: SettlementProgress | null }> => {
      try {
        return { started: true, progress: await getSettlementProgress(groupId) };
      } catch {
        return { started: false, progress: null }; // 404 = 미시작
      }
    },
    enabled: Number.isFinite(groupId),
  });
  const started = settlementQuery.data?.started ?? null; // null = 로딩
  const progress = settlementQuery.data?.progress ?? null;

  // 정산 변화 → 정산/지출 요약 모두 갱신(본인 즉시 + 다른 멤버는 SSE로).
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: groupQueryKeys.expenses(groupId) });
    onChanged?.();
  };

  const handleStart = async () => {
    setBusyId('start');
    try {
      await startSettlement(groupId);
      refresh();
      toast.success('정산을 시작했어요', '각자 송금 후 완료를 체크하세요.');
    } catch (err) {
      toast.error('정산을 시작할 수 없어요', apiMessage(err) || '정산할 금액이 없을 수 있어요.');
    } finally {
      setBusyId(null);
    }
  };

  const act = async (id: number, fn: () => Promise<unknown>, okMsg: string) => {
    setBusyId(id);
    try {
      await fn();
      refresh();
      toast.success(okMsg);
    } catch (err) {
      toast.error('처리에 실패했어요', apiMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (started === null) return null;

  // ── 미시작: 계산 결과 + 시작 버튼 ──
  if (!started) {
    if (fallback.length === 0) return null; // 정산 불필요(잔액 0)
    return (
      <section>
        <h2 className="mb-2.5 text-[13px] font-extrabold tracking-wide text-muted">정산 요약</h2>
        <div className="space-y-2.5">
          {fallback.map((s, i) => (
            <div key={i} className="rounded-card border border-border bg-surface p-3.5">
              <FromTo from={s.fromName} to={s.toName} amount={s.amount} />
            </div>
          ))}
        </div>
        <Button size="lg" fullWidth className="mt-3" loading={busyId === 'start'} onClick={handleStart}>
          정산 시작하기
        </Button>
      </section>
    );
  }

  // ── 진행 중 ──
  const transfers = progress?.transfers ?? [];
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[13px] font-extrabold tracking-wide text-muted">정산 진행</h2>
        {progress?.completed && (
          <span className="rounded-full bg-[#EAF9EF] px-2.5 py-1 text-[12px] font-extrabold text-success">정산 완료 🎉</span>
        )}
      </div>
      <div className="space-y-2.5">
        {transfers.map((t: SettlementRecord) => {
          const iAmSender = t.fromUserId === currentUserId;
          const iAmReceiver = t.toUserId === currentUserId;
          return (
            <div key={t.id} className="rounded-card border border-border bg-surface p-3.5">
              <div className="flex items-center gap-2">
                <FromTo from={t.fromName} to={t.toName} amount={t.amount} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${STATUS[t.status].cls}`}>
                  {STATUS[t.status].label}
                </span>

                {/* 내가 보낼 송금(PENDING) — 외부 결제 딥링크 없이 정산 완료 표시만 */}
                {iAmSender && t.status === 'PENDING' && (
                  <div className="ml-auto">
                    <Button size="sm" loading={busyId === t.id} onClick={() => act(t.id, () => confirmSent(groupId, t.id), '송금 완료로 표시했어요')}>송금 완료</Button>
                  </div>
                )}

                {/* 내가 받을 송금(SENT) */}
                {iAmReceiver && t.status === 'SENT' && (
                  <div className="ml-auto">
                    <Button size="sm" loading={busyId === t.id} onClick={() => act(t.id, () => confirmReceived(groupId, t.id), '수령을 확인했어요')}>수령 확인</Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
