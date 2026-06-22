import { useCallback, useEffect, useState } from 'react';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';
import {
  getSettlementProgress,
  startSettlement,
  getPaymentLinks,
  confirmSent,
  confirmReceived,
} from '../../api/settlement';
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
 * - 미시작: 최소 송금 계산 결과 표시 + "정산 시작하기"
 * - 진행 중: 송금별 상태 + 내 송금엔 Toss/카카오페이 딥링크 & "송금 완료", 내 수취엔 "수령 확인"
 */
export default function SettlementPanel({
  groupId,
  currentUserId,
  fallback,
}: {
  groupId: number;
  currentUserId: number;
  fallback: FallbackTransfer[];
}) {
  const toast = useToast();
  const [progress, setProgress] = useState<SettlementProgress | null>(null);
  const [started, setStarted] = useState<boolean | null>(null); // null=로딩
  const [busyId, setBusyId] = useState<number | 'start' | null>(null);

  const load = useCallback(async () => {
    try {
      setProgress(await getSettlementProgress(groupId));
      setStarted(true);
    } catch {
      setStarted(false); // 404 = 미시작
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  const handleStart = async () => {
    setBusyId('start');
    try {
      setProgress(await startSettlement(groupId));
      setStarted(true);
      toast.success('정산을 시작했어요', '각자 송금 후 완료를 체크하세요.');
    } catch (err) {
      toast.error('정산을 시작할 수 없어요', apiMessage(err) || '정산할 금액이 없을 수 있어요.');
    } finally {
      setBusyId(null);
    }
  };

  const act = async (id: number, fn: () => Promise<SettlementProgress>, okMsg: string) => {
    setBusyId(id);
    try {
      setProgress(await fn());
      toast.success(okMsg);
    } catch (err) {
      toast.error('처리에 실패했어요', apiMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const pay = async (id: number, kind: 'toss' | 'kakao') => {
    try {
      const links = await getPaymentLinks(groupId, id);
      window.location.href = kind === 'toss' ? links.tossDeepLink : links.kakaoPayDeepLink;
    } catch (err) {
      toast.error('송금 링크를 만들 수 없어요', apiMessage(err));
    }
  };

  if (started === null) return null;

  // ── 미시작: 계산 결과 + 시작 버튼 ──
  if (!started) {
    if (fallback.length === 0) return null; // 정산 불필요(잔액 0)
    return (
      <section>
        <h2 className="mb-2.5 text-[13px] font-extrabold tracking-wide text-[#BCA48C]">정산 요약</h2>
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
        <h2 className="text-[13px] font-extrabold tracking-wide text-[#BCA48C]">정산 진행</h2>
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

                {/* 내가 보낼 송금(PENDING) */}
                {iAmSender && t.status === 'PENDING' && (
                  <div className="ml-auto flex gap-2">
                    <button type="button" onClick={() => pay(t.id, 'toss')} className="rounded-button bg-[#3182F6] px-3 py-1.5 text-[12px] font-extrabold text-white">토스</button>
                    <button type="button" onClick={() => pay(t.id, 'kakao')} className="rounded-button bg-[#FEE500] px-3 py-1.5 text-[12px] font-extrabold text-[#3C1E1E]">카카오페이</button>
                    <Button size="sm" variant="secondary" loading={busyId === t.id} onClick={() => act(t.id, () => confirmSent(groupId, t.id), '송금 완료로 표시했어요')}>송금 완료</Button>
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
