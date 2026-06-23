import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import Avatar from '../../components/Avatar';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import ChangePasswordModal from './ChangePasswordModal';
import { deleteAccount } from '../../api/user';
import { logout } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import { cn } from '../../lib/cn';

/**
 * 마이페이지 — 프로필, 페르소나, 메뉴, 계정 탈퇴(비번 확인).
 * ⚠️ 이름 변경 API 는 Part A 에 없어 읽기 전용. (제공 시 인라인 수정 추가)
 */
export default function MyPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [pwOpen, setPwOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delPw, setDelPw] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleLogout = async () => {
    // 서버 Refresh Token/쿠키 정리. 실패해도 클라이언트 세션은 비운다(FR-AUTH-04).
    try {
      await logout();
    } catch {
      /* 이미 만료/무효일 수 있음 — 무시 */
    }
    clearAuth();
    navigate('/login', { replace: true });
  };

  const confirmDelete = async () => {
    if (delPw.length < 1) return;
    setDeleting(true);
    try {
      await deleteAccount(delPw);
      toast.info('탈퇴 처리되었습니다');
      clearAuth();
      navigate('/login', { replace: true });
    } catch (e: unknown) {
      // Owner 인 그룹이 있으면 400
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 400) {
        toast.error('탈퇴할 수 없어요', '소유한 그룹의 위임 또는 해체를 먼저 진행해 주세요.');
      } else {
        toast.error('탈퇴에 실패했어요', '비밀번호를 확인해 주세요.');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout title="마이페이지">
      {/* 프로필 */}
      <div className="flex items-center gap-3.5">
        <Avatar name={user?.name ?? '여행자'} size="lg" className="size-[60px] text-2xl" />
        <div className="min-w-0 flex-1">
          <div className="text-[19px] font-extrabold">{user?.name ?? '여행자'}</div>
          <p className="mt-0.5 text-[13px] text-muted">{user?.email ?? '-'}</p>
        </div>
      </div>

      {/* 페르소나 */}
      <button type="button" onClick={() => navigate('/survey/result')}
        className="mt-4 flex w-full items-center gap-2.5 rounded-card border border-border bg-surface px-3.5 py-3 text-left">
        <span className="text-[22px]">🍜</span>
        <div className="flex-1">
          <div className="text-[14px] font-extrabold">내 여행 페르소나</div>
          <div className="text-[12px] text-muted">설문 결과 보기</div>
        </div>
        <span className="text-[12px] font-bold text-[#E8742E]">결과 보기 ›</span>
      </button>

      {/* 메뉴 */}
      <div className="mt-3.5 overflow-hidden rounded-card border border-border bg-surface">
        <MenuRow label="비밀번호 변경" onClick={() => setPwOpen(true)} border />
        <MenuRow label="설문 다시하기" onClick={() => navigate('/survey')} border />
        <MenuRow label="로그아웃" onClick={handleLogout} />
      </div>

      {/* 위험 구역 */}
      <p className="mb-2 mt-6 text-[12px] font-extrabold tracking-wide text-[#C9AFA0]">위험 구역</p>
      <button type="button" onClick={() => { setDelPw(''); setDelOpen(true); }}
        className="w-full rounded-card border border-[#FECACA] bg-surface px-4 py-3.5 text-left text-[15px] font-bold text-danger transition-colors hover:bg-[#FEF2F2]">
        계정 탈퇴
      </button>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />

      <Modal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        title="정말 탈퇴하시겠어요?"
        description="계정을 삭제하면 참여 중인 그룹과 일정·정산 기록이 모두 사라지며 복구할 수 없습니다. 확인을 위해 비밀번호를 입력해 주세요."
        dismissable={!deleting}
        icon={
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#FEE2E2]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 3 2 20h20L12 3Z" stroke="#EF4444" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 10v4M12 17v.5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        }
        footer={
          <>
            <Button variant="ghost" fullWidth className="border border-border" disabled={deleting} onClick={() => setDelOpen(false)}>취소</Button>
            <Button variant="danger" fullWidth loading={deleting} disabled={delPw.length < 1} onClick={confirmDelete}>탈퇴하기</Button>
          </>
        }
      >
        <Input type="password" label="비밀번호" value={delPw} onChange={(e) => setDelPw(e.target.value)} placeholder="••••••••" />
      </Modal>
    </AppLayout>
  );
}

function MenuRow({ label, onClick, border }: { label: string; onClick: () => void; border?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex w-full items-center px-3.5 py-[15px] text-left text-[15px] font-semibold', border && 'border-b border-[#F4ECE0]')}>
      <span className="flex-1">{label}</span>
      <span className="text-[#C0AE9B]">›</span>
    </button>
  );
}
