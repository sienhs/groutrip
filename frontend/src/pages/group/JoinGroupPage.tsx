import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { joinGroup } from '../../api/group';
import { useToast } from '../../components/Toast';
import { Button, Card } from '../../components';
import AuthBrand from '../auth/AuthBrand';
import type { ApiResponse } from '../../types/auth';

/**
 * 초대 링크 가입(/join/:code). 공유받은 링크로 들어오면 코드 확인 후 한 번에 참여한다.
 * 미로그인 상태로 진입하면 ProtectedRoute가 /login으로 보내고, 로그인 후 이 경로로 복귀한다.
 */
export default function JoinGroupPage() {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [joining, setJoining] = useState(false);

  const join = async () => {
    setJoining(true);
    try {
      const group = await joinGroup(code.toUpperCase());
      toast.success('그룹에 참여했어요', group.title);
      navigate(`/groups/${group.id}`, { replace: true });
    } catch (err) {
      const message = (err as AxiosError<ApiResponse<null>>).response?.data?.message;
      toast.error('참여하지 못했어요', message ?? '초대 코드가 유효하지 않거나 만료되었어요.');
      navigate('/groups', { replace: true });
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center bg-background px-6 py-10">
      <AuthBrand subtitle="여행 그룹 초대" />
      <Card padding="lg">
        <div className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-[#FFF1E6] text-[26px]">🎟️</div>
          <p className="text-[15px] font-extrabold text-foreground">그룹 초대를 받았어요</p>
          <p className="mt-1 text-[13px] text-muted">
            초대 코드 <b className="tracking-[0.15em] text-foreground">{code.toUpperCase()}</b> 로 참여합니다.
          </p>
          <Button fullWidth size="lg" className="mt-5" loading={joining} onClick={join}>
            그룹 참여하기
          </Button>
          <button
            type="button"
            onClick={() => navigate('/groups', { replace: true })}
            className="mt-3 text-[13px] font-bold text-muted"
          >
            나중에 할게요
          </button>
        </div>
      </Card>
    </div>
  );
}
