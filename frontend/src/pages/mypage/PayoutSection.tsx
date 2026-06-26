import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { getMyPayout, updateMyPayout } from '../../api/user';
import { appQueryKeys } from '../../queryKeys/appQueryKeys';
import { cn } from '../../lib/cn';

/**
 * 마이페이지 '정산 받기' 섹션.
 * 링크/계좌는 상시 노출하지 않고 모달에서만 입력/수정한다(개인정보 최소 노출).
 * 홈 배너에서 ?settle=1 로 진입하면 모달을 자동으로 연다.
 */
export default function PayoutSection() {
  const toast = useToast();
  const queryClient = useQueryClient();

  // 조회 결과는 편집 가능한 드래프트로 시드한다.
  const { data: payoutData } = useQuery({ queryKey: appQueryKeys.myPayout(), queryFn: getMyPayout });
  const [payoutLink, setPayoutLink] = useState('');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [payoutDirty, setPayoutDirty] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const payoutRegistered = !!(payoutLink.trim() || payoutAccount.trim());

  useEffect(() => {
    if (!payoutData) return;
    setPayoutLink(payoutData.payoutLink ?? '');
    setPayoutAccount(payoutData.payoutAccount ?? '');
  }, [payoutData]);

  // 홈 배너에서 ?settle=1 로 진입하면 정산 설정 모달을 자동으로 연다(바로가기).
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('settle') === '1') {
      setPayoutOpen(true);
      searchParams.delete('settle');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // 저장 성공 시 payout 캐시를 갱신해 홈 배너(미등록 안내)도 즉시 동기화된다.
  const payoutMutation = useMutation({
    mutationFn: () => updateMyPayout({
      payoutLink: payoutLink.trim() || null,
      payoutAccount: payoutAccount.trim() || null,
    }),
    onSuccess: (saved) => {
      setPayoutLink(saved.payoutLink ?? '');
      setPayoutAccount(saved.payoutAccount ?? '');
      setPayoutDirty(false);
      setPayoutOpen(false);
      queryClient.setQueryData(appQueryKeys.myPayout(), saved);
      toast.success('정산 정보를 저장했어요', '정산에서 다른 멤버가 이 링크/계좌로 송금할 수 있어요.');
    },
    onError: () => toast.error('저장에 실패했어요', '잠시 후 다시 시도해 주세요.'),
  });
  const savePayout = () => payoutMutation.mutate();
  const payoutSaving = payoutMutation.isPending;

  return (
    <>
      <p className="mb-2 mt-6 text-[12px] font-extrabold tracking-wide text-muted">정산 받기</p>
      <button
        type="button"
        onClick={() => setPayoutOpen(true)}
        className="flex w-full items-center gap-3 rounded-card border border-border bg-surface px-3.5 py-3 text-left"
      >
        <span className="flex size-9 flex-none items-center justify-center rounded-[12px] bg-[#E0F6FD] text-accent">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" />
            <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-extrabold">정산 받을 링크 · 계좌</div>
          <div className="text-[12px] text-muted">
            {payoutRegistered ? '등록됨 · 탭하여 수정' : '미등록 · 친구가 송금할 수 있게 등록'}
          </div>
        </div>
        <span
          className={cn(
            'flex-none rounded-full px-2 py-0.5 text-[11px] font-bold',
            payoutRegistered ? 'bg-[#E9F8EE] text-[#22A964]' : 'bg-[#FFF1FA] text-[#C25478]',
          )}
        >
          {payoutRegistered ? '완료' : '필요'}
        </span>
      </button>

      {/* 정산 받기 설정 모달 — 송금 링크(권장) 우선, 계좌는 선택. 동의/고지 문구 포함 */}
      <Modal
        open={payoutOpen}
        onClose={() => setPayoutOpen(false)}
        title="정산 받기 설정"
        description="정산할 때 다른 멤버가 이 정보로 바로 송금할 수 있어요. 비워두면 표시되지 않아요."
        dismissable={!payoutSaving}
        footer={
          <>
            <Button variant="ghost" fullWidth className="border border-border" disabled={payoutSaving} onClick={() => setPayoutOpen(false)}>닫기</Button>
            <Button variant="primary" fullWidth loading={payoutSaving} disabled={!payoutDirty} onClick={savePayout}>저장</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="payout-link" className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-muted">
              송금 링크 (토스·카카오페이)
              <span className="rounded-full bg-[#FFF1FA] px-1.5 py-0.5 text-[10px] font-bold text-[#C25478]">권장</span>
            </label>
            <input
              id="payout-link"
              value={payoutLink}
              onChange={(e) => { setPayoutLink(e.target.value); setPayoutDirty(true); }}
              placeholder="예: https://toss.me/내아이디"
              inputMode="url"
              className="w-full rounded-button border border-border bg-background px-3 py-2 text-[14px] outline-none focus:border-primary"
            />
            <p className="mt-1 text-[11px] leading-snug text-muted">링크가 가장 간편해요. 누르면 바로 송금 화면으로 연결돼요.</p>
          </div>
          <div>
            <label htmlFor="payout-account" className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-muted">
              계좌
              <span className="rounded-full bg-border/70 px-1.5 py-0.5 text-[10px] font-bold text-muted">선택</span>
            </label>
            <input
              id="payout-account"
              value={payoutAccount}
              onChange={(e) => { setPayoutAccount(e.target.value); setPayoutDirty(true); }}
              placeholder="예: 카카오뱅크 3333-01-1234567 홍길동"
              className="w-full rounded-button border border-border bg-background px-3 py-2 text-[14px] outline-none focus:border-primary"
            />
          </div>
          <p className="rounded-button bg-background px-3 py-2 text-[11px] leading-relaxed text-muted">
            🔒 GrouTrip 편돌즈는 결제·송금을 직접 처리하지 않고, 입력하신 정보는 정산 시 멤버에게 표시되는 용도로만 쓰여요. 계좌 정보는 암호화되어 저장되며, 탈퇴 시 함께 삭제돼요.
          </p>
        </div>
      </Modal>
    </>
  );
}
