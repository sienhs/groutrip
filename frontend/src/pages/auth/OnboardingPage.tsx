import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { updateMyName, updateMyPayout, markOnboarded } from '../../api/user';
import { cn } from '../../lib/cn';
import { isOnboardedLocal, markOnboardedLocal } from '../../lib/onboarding';
import Button from '../../components/Button';

type Step = 'consent' | 'profile' | 'style' | 'payout';
const STEPS: Step[] = ['consent', 'profile', 'style', 'payout'];

const TRAVEL_GROUP_OPTIONS = ['혼자', '2명', '3~4명', '5명 이상'];
const TRAVEL_STYLE_OPTIONS = ['꼼꼼한 계획형', '어느정도 계획', '즉흥형'];
const TRAVEL_DEST_OPTIONS = ['국내', '해외', '둘 다'];

function Chip({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-2 text-[13px] font-bold transition-colors',
        selected
          ? 'border-primary bg-primary text-white'
          : 'border-border bg-surface text-foreground hover:border-primary/50',
      )}
    >
      {label}
    </button>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUserName = useAuthStore((s) => s.updateUserName);

  const [step, setStep] = useState<Step>('consent');
  const [consented, setConsented] = useState(false);

  const [name, setName] = useState(user?.name ?? '');
  const [nameError, setNameError] = useState('');

  const [travelGroup, setTravelGroup] = useState<string | null>(null);
  const [travelStyle, setTravelStyle] = useState<string | null>(null);
  const [travelDest, setTravelDest] = useState<string | null>(null);

  const [payoutLink, setPayoutLink] = useState('');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && isOnboardedLocal(user.id)) navigate('/', { replace: true });
  }, [user, navigate]);

  if (!user) return null;

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const goNext = () => setStep(STEPS[stepIndex + 1]);

  const handleProfileNext = () => {
    if (!name.trim()) { setNameError('이름을 입력해 주세요.'); return; }
    setNameError('');
    goNext();
  };

  const finish = async (skipPayout: boolean) => {
    setSaving(true);
    try {
      if (name.trim() !== user.name) {
        const updated = await updateMyName(name.trim());
        updateUserName(updated);
      }
      if (!skipPayout && (payoutLink.trim() || payoutAccount.trim())) {
        await updateMyPayout({
          payoutLink: payoutLink.trim() || null,
          payoutAccount: payoutAccount.trim() || null,
        });
      }
      if (travelGroup || travelStyle || travelDest) {
        localStorage.setItem(`travel_style_${user.id}`, JSON.stringify({ travelGroup, travelStyle, travelDest }));
      }
      // 서버에 온보딩 완료 기록(계정 단위 — 다른 기기/재로그인에도 1회만). 로컬은 보조 캐시.
      try {
        await markOnboarded();
      } catch {
        // 서버 기록 실패해도 흐름은 진행(로컬 캐시로 최소 보장).
      }
      markOnboardedLocal(user.id);
      const redirect = sessionStorage.getItem('post_login_redirect');
      if (redirect) {
        sessionStorage.removeItem('post_login_redirect');
        navigate(redirect, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background px-6 py-8">
      {/* 진행 바 */}
      <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-skeleton">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#F3B9CB] to-primary transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Step 1: 개인정보 동의 ── */}
      {step === 'consent' && (
        <div className="flex flex-1 flex-col">
          <div className="flex-1">
            <div className="mb-6 flex size-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#FFCFEB] to-primary text-[30px] shadow">
              👋
            </div>
            <h1 className="text-[26px] font-extrabold tracking-tight">환영해요!</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              그루트립에서 친구들과 여행 계획을 함께 만들어 보세요.
              시작하기 전에 몇 가지를 알려드려요.
            </p>

            <div className="mt-6 rounded-card border border-border bg-surface p-4 text-[13px] leading-relaxed text-muted">
              <p className="mb-2 font-extrabold text-foreground">개인정보 수집 및 이용 안내</p>
              <ul className="space-y-1.5 pl-1">
                <li><span className="font-bold text-foreground">수집 항목</span>: 이름, 이메일, 정산 링크/계좌(선택)</li>
                <li><span className="font-bold text-foreground">수집 목적</span>: 여행 그룹 관리, 일정 협업, 비용 정산 등 서비스 기능 제공에만 사용돼요. 마케팅·광고 목적으로는 절대 사용되지 않아요.</li>
                <li><span className="font-bold text-foreground">보존 기간</span>: 회원 탈퇴 즉시 삭제</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setConsented(!consented)}
              className="mt-4 flex w-full items-center gap-3 rounded-card border border-border bg-surface px-4 py-3.5 text-left"
            >
              <span className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
                consented ? 'border-primary bg-primary' : 'border-border',
              )}>
                {consented && (
                  <svg width="12" height="9" viewBox="0 0 12 9" fill="none" aria-hidden>
                    <path d="M1 4.5L4.5 8L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="text-[14px] font-bold text-foreground">위 내용에 동의합니다 (필수)</span>
            </button>
          </div>

          <Button size="lg" fullWidth disabled={!consented} onClick={goNext} className="mt-6">
            동의하고 시작하기
          </Button>
        </div>
      )}

      {/* ── Step 2: 기본 정보 ── */}
      {step === 'profile' && (
        <div className="flex flex-1 flex-col">
          <div className="flex-1">
            <h2 className="text-[24px] font-extrabold">기본 정보를 확인해요</h2>
            <p className="mt-2 text-[14px] text-muted">소셜 계정으로 가져온 정보예요. 이름은 수정할 수 있어요.</p>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="onboard-name" className="mb-1.5 block text-[12px] font-extrabold text-muted">
                  이름
                </label>
                <input
                  id="onboard-name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(''); }}
                  className="w-full rounded-button border border-border bg-background px-3.5 py-3 text-[15px] font-bold outline-none focus:border-primary"
                  placeholder="표시될 이름을 입력하세요"
                />
                {nameError && <p className="mt-1 text-[12px] text-danger">{nameError}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-extrabold text-muted">이메일</label>
                <div className="flex items-center gap-2 rounded-button border border-border bg-skeleton px-3.5 py-3">
                  <span className="text-[15px] text-muted">{user.email}</span>
                  <span className="ml-auto rounded-full bg-[#E9F8EE] px-2 py-0.5 text-[11px] font-bold text-[#22A964]">확인됨</span>
                </div>
                <p className="mt-1 text-[12px] text-muted">소셜 계정에서 가져온 이메일로 변경할 수 없어요.</p>
              </div>
            </div>
          </div>

          <Button size="lg" fullWidth onClick={handleProfileNext} className="mt-6">
            다음
          </Button>
        </div>
      )}

      {/* ── Step 3: 여행 스타일 ── */}
      {step === 'style' && (
        <div className="flex flex-1 flex-col">
          <div className="flex-1">
            <h2 className="text-[24px] font-extrabold">여행 스타일을 알려주세요</h2>
            <p className="mt-2 text-[14px] text-muted">나중에 마이페이지에서 언제든 바꿀 수 있어요.</p>

            <div className="mt-6 space-y-6">
              <div>
                <p className="mb-3 text-[13px] font-extrabold text-foreground">주로 몇 명과 여행하나요?</p>
                <div className="flex flex-wrap gap-2">
                  {TRAVEL_GROUP_OPTIONS.map((o) => (
                    <Chip key={o} label={o} selected={travelGroup === o} onClick={() => setTravelGroup(o === travelGroup ? null : o)} />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-[13px] font-extrabold text-foreground">여행 스타일은요?</p>
                <div className="flex flex-wrap gap-2">
                  {TRAVEL_STYLE_OPTIONS.map((o) => (
                    <Chip key={o} label={o} selected={travelStyle === o} onClick={() => setTravelStyle(o === travelStyle ? null : o)} />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-[13px] font-extrabold text-foreground">주로 어디로 여행하나요?</p>
                <div className="flex flex-wrap gap-2">
                  {TRAVEL_DEST_OPTIONS.map((o) => (
                    <Chip key={o} label={o} selected={travelDest === o} onClick={() => setTravelDest(o === travelDest ? null : o)} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Button size="lg" fullWidth onClick={goNext}>다음</Button>
            <button
              type="button"
              onClick={goNext}
              className="text-center text-[13px] font-bold text-muted hover:text-foreground"
            >
              건너뛰기
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: 정산 정보 ── */}
      {step === 'payout' && (
        <div className="flex flex-1 flex-col">
          <div className="flex-1">
            <h2 className="text-[24px] font-extrabold">정산 정보를 등록하세요</h2>
            <p className="mt-2 text-[14px] text-muted">
              여행 중 쓴 비용을 정산할 때 친구들이 이 정보로 바로 송금할 수 있어요.
              나중에 마이페이지에서 등록해도 돼요.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="ob-payout-link" className="mb-1.5 flex items-center gap-1.5 text-[12px] font-extrabold text-muted">
                  송금 링크
                  <span className="rounded-full bg-[#FFF1FA] px-1.5 py-0.5 text-[10px] font-bold text-[#C25478]">권장</span>
                </label>
                <input
                  id="ob-payout-link"
                  value={payoutLink}
                  onChange={(e) => setPayoutLink(e.target.value)}
                  placeholder="예: https://toss.me/내아이디"
                  inputMode="url"
                  className="w-full rounded-button border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-primary"
                />
                <p className="mt-1 text-[12px] text-muted">토스·카카오페이 링크가 가장 간편해요.</p>
              </div>
              <div>
                <label htmlFor="ob-payout-account" className="mb-1.5 flex items-center gap-1.5 text-[12px] font-extrabold text-muted">
                  계좌
                  <span className="rounded-full bg-border/70 px-1.5 py-0.5 text-[10px] font-bold text-muted">선택</span>
                </label>
                <input
                  id="ob-payout-account"
                  value={payoutAccount}
                  onChange={(e) => setPayoutAccount(e.target.value)}
                  placeholder="예: 카카오뱅크 3333-01-1234567 홍길동"
                  className="w-full rounded-button border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-primary"
                />
              </div>
              <div className="rounded-button bg-skeleton px-3.5 py-3 text-[12px] leading-relaxed text-muted">
                🔒 입력하신 정산 정보는 오직 그룹 비용 정산 기능에만 사용되며, 암호화 저장 후 탈퇴 즉시 삭제돼요.
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Button size="lg" fullWidth loading={saving} onClick={() => finish(false)}>
              {payoutLink.trim() || payoutAccount.trim() ? '저장하고 시작하기' : '시작하기'}
            </Button>
            <button
              type="button"
              disabled={saving}
              onClick={() => finish(true)}
              className="text-center text-[13px] font-bold text-muted hover:text-foreground disabled:opacity-40"
            >
              나중에 하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
