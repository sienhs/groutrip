import { useState } from 'react';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';
import { changePassword } from '../../api/user';

/** 비밀번호 변경 모달(현재/새/확인). */
export default function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;
  const valid = current.length >= 8 && next.length >= 8 && next === confirm;

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); };

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      toast.success('비밀번호를 변경했어요');
      reset();
      onClose();
    } catch {
      toast.error('변경에 실패했어요', '현재 비밀번호를 확인해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="비밀번호 변경"
      dismissable={!submitting}
      footer={
        <>
          <Button variant="ghost" fullWidth className="border border-border" disabled={submitting} onClick={() => { reset(); onClose(); }}>
            취소
          </Button>
          <Button fullWidth loading={submitting} disabled={!valid} onClick={handleSubmit}>
            변경
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input type="password" label="현재 비밀번호" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="••••••••" />
        <Input type="password" label="새 비밀번호" value={next} onChange={(e) => setNext(e.target.value)} helper="8자 이상" placeholder="••••••••" />
        <Input
          type="password"
          label="새 비밀번호 확인"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? '비밀번호가 일치하지 않아요.' : undefined}
          placeholder="••••••••"
        />
      </div>
    </Modal>
  );
}
