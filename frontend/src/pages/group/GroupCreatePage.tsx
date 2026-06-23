import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import Input from '../../components/Input';
import DestinationAutocomplete from '../../components/DestinationAutocomplete';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';
import { createGroup } from '../../api/group';
import { COVER_GRADIENT, COVER_LABEL, COVER_PRESETS } from './groupUi';
import { cn } from '../../lib/cn';
import type { CoverPreset } from '../../types/group';

/** 그룹 만들기 — 이름/기간/커버(8종). 생성 후 허브로 이동. */
export default function GroupCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [cover, setCover] = useState<CoverPreset>('SUNSET');
  const [submitting, setSubmitting] = useState(false);

  const valid =
    title.trim().length > 0 && destination.trim().length > 0 && !!start && !!end && start <= end;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    try {
      const group = await createGroup({
        title: title.trim(),
        destination: destination.trim(),
        startDate: start,
        endDate: end,
        coverImageKey: cover,
      });
      toast.success('그룹을 만들었어요', group.title);
      navigate(`/groups/${group.id}`, { replace: true });
    } catch {
      toast.error('그룹 생성에 실패했어요', '잠시 후 다시 시도해 주세요.');
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="새 그룹 만들기" showBack hideBottomNav>
      <form onSubmit={handleSubmit} className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
        <div className="flex-1 space-y-5">
          {/* 미리보기 */}
          <div className={cn('flex h-28 items-end rounded-card p-3.5 shadow-sm', COVER_GRADIENT[cover])}>
            <span className="text-[17px] font-extrabold text-white drop-shadow">
              {title.trim() || COVER_LABEL[cover]}
            </span>
          </div>

          <Input
            label="그룹 이름"
            value={title}
            maxLength={30}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 제주도 한 바퀴"
          />

          <DestinationAutocomplete
            label="목적지"
            value={destination}
            onChange={setDestination}
            placeholder="지역명을 입력하세요 (예: 용인, 제주)"
            helper="목록에서 지역을 선택하면 목적지별 추천이 정확해져요."
          />

          <div>
            <span className="mb-1.5 block text-[13px] font-bold text-[#3A322B]">여행 기간</span>
            <div className="flex items-center gap-2">
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              <span className="text-[#C0AE9B]">–</span>
              <Input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
            </div>
            {start && end && start > end && (
              <p className="mt-1.5 text-[12px] text-danger">종료일이 시작일보다 빠를 수 없어요.</p>
            )}
          </div>

          <div>
            <span className="mb-2 block text-[13px] font-bold text-[#3A322B]">
              커버 <span className="font-medium text-[#BCA48C]">(8종)</span>
            </span>
            <div className="grid grid-cols-4 gap-2">
              {COVER_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={COVER_LABEL[c]}
                  aria-pressed={cover === c}
                  onClick={() => setCover(c)}
                  className={cn(
                    'h-[52px] rounded-[10px] transition-transform active:scale-95',
                    COVER_GRADIENT[c],
                    cover === c && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 -mx-4 border-t border-border bg-surface px-4 py-3">
          <Button type="submit" size="lg" fullWidth loading={submitting} disabled={!valid}>
            그룹 만들기
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
