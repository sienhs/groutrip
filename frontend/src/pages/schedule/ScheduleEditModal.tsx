import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';
import { updateSchedule } from '../../api/schedule';
import { groupQueryKeys } from '../../queryKeys/groupQueryKeys';
import type { Schedule } from '../../types/schedule';

interface Props {
  groupId: number;
  schedule: Schedule;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * FR-SCHEDULE-02: 일정 수정. 제목(빈 일정)·시간·메모를 수정한다.
 * 예상 비용은 정산 연동 때문에 카드의 전용 편집기에서 다루므로 여기선 기존 값을 보존한다.
 * 일자/순서 변경은 드래그로 처리한다.
 */
export default function ScheduleEditModal({ groupId, schedule, onClose, onSaved }: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const isEmpty = schedule.placeId === null; // 빈 일정만 제목을 직접 수정할 수 있다.
  const [title, setTitle] = useState(schedule.title ?? '');
  const [start, setStart] = useState(schedule.startTime);
  const [end, setEnd] = useState(schedule.endTime);
  const [memo, setMemo] = useState(schedule.memo ?? '');

  const timeValid = start < end;
  const valid = timeValid && (!isEmpty || title.trim().length > 0);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateSchedule(groupId, schedule.id, {
        title: isEmpty ? title.trim() : undefined,
        startTime: start,
        endTime: end,
        memo: memo.trim() || undefined,
        // 비용·이동수단·상태는 다른 흐름에서 관리하므로 기존 값을 그대로 보존한다.
        estimatedCost: schedule.estimatedCost ?? undefined,
        transportMode: schedule.transportMode ?? undefined,
        status: schedule.status ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.schedules(groupId) });
      toast.success('일정을 수정했어요');
      onSaved();
      onClose();
    },
    onError: (e) => {
      const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error('일정 수정에 실패했어요', message ?? '잠시 후 다시 시도해 주세요.');
    },
  });
  const saving = saveMutation.isPending;
  const handleSave = () => { if (valid) saveMutation.mutate(); };

  return (
    <Modal
      open
      onClose={() => !saving && onClose()}
      title="일정 수정"
      footer={
        <>
          <Button variant="ghost" fullWidth className="border border-border" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button fullWidth onClick={handleSave} loading={saving} disabled={!valid}>
            저장
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {isEmpty ? (
          <Input
            label="일정 제목"
            value={title}
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 점심 먹을 곳 (투표로 정하기)"
          />
        ) : (
          <div>
            <span className="mb-1.5 block text-[13px] font-bold text-foreground">장소</span>
            <p className="rounded-card border border-border bg-background px-3 py-2 text-[13px] text-muted">
              {schedule.placeName}
            </p>
          </div>
        )}
        <div>
          <span className="mb-1.5 block text-[13px] font-bold text-foreground">시간</span>
          <div className="flex items-center gap-2">
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            <span className="text-[#B6B1C4]">–</span>
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          {!timeValid && <p className="mt-1.5 text-[12px] text-danger">종료 시각이 시작보다 빨라요.</p>}
        </div>
        <Input
          label="메모 (선택)"
          value={memo}
          maxLength={500}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="예: 오션뷰 자리 예약"
        />
      </div>
    </Modal>
  );
}
