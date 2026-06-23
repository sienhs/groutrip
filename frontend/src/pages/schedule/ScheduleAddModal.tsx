import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';
import { addSchedule } from '../../api/schedule';
import { getBookmarks } from '../../api/place';
import { getGroup } from '../../api/group';
import { cn } from '../../lib/cn';
import type { BookmarkResponse } from '../../types/place';

interface Props {
  groupId: number;
  /** 기본 선택 일자(현재 보고 있는 일차). 없으면 그룹 시작일. */
  defaultDate?: string;
  onClose: () => void;
  onAdded: () => void;
}

/**
 * FR-SCHEDULE-01: 일정 추가. 보관함 장소 + 일자 + 시작/종료 시각(+메모/예상비용).
 * 일자는 그룹 여행 기간 내로 제한(백엔드도 SCHEDULE_OUT_OF_PERIOD 검증).
 */
export default function ScheduleAddModal({ groupId, defaultDate, onClose, onAdded }: Props) {
  const toast = useToast();
  const [bookmarks, setBookmarks] = useState<BookmarkResponse[]>([]);
  const [period, setPeriod] = useState<{ start: string; end: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // 'place' = 보관함 장소 / 'empty' = 빈 일정(제목만, 나중에 투표로 장소 결정)
  const [kind, setKind] = useState<'place' | 'empty'>('place');
  const [placeId, setPlaceId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate ?? '');
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('12:00');
  const [memo, setMemo] = useState('');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getBookmarks(groupId), getGroup(groupId)])
      .then(([bms, g]) => {
        if (cancelled) return;
        setBookmarks(bms);
        setPeriod({ start: g.startDate, end: g.endDate });
        setDate((d) => d || defaultDate || g.startDate);
        setPlaceId((p) => p || (bms[0] ? String(bms[0].place.placeId) : ''));
        // 보관함이 비어 있으면 빈 일정으로 시작
        if (bms.length === 0) setKind('empty');
      })
      .catch(() => {
        if (!cancelled) toast.error('정보를 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const timeValid = start < end;
  const valid = !!date && timeValid && (kind === 'place' ? !!placeId : !!title.trim());

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await addSchedule(groupId, {
        placeId: kind === 'place' ? Number(placeId) : undefined,
        title: kind === 'empty' ? title.trim() : undefined,
        scheduleDate: date,
        startTime: start,
        endTime: end,
        memo: memo.trim() || undefined,
        estimatedCost: cost ? Number(cost) : undefined,
      });
      toast.success('일정에 추가했어요');
      onAdded();
      onClose();
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error('일정 추가에 실패했어요', message ?? '여행 기간 내 일자인지 확인해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => !saving && onClose()}
      title="일정에 장소 추가"
      footer={
        <>
          <Button variant="ghost" fullWidth className="border border-border" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button fullWidth onClick={handleSave} loading={saving} disabled={!valid || loading}>
            추가
          </Button>
        </>
      }
    >
      {loading ? (
        <p className="py-8 text-center text-[13px] text-muted">불러오는 중…</p>
      ) : (
        <div className="space-y-3">
          {/* 장소 방식 토글 */}
          <div className="flex gap-1.5">
            {([
              { v: 'place', label: '보관함 장소' },
              { v: 'empty', label: '빈 일정(투표로 정하기)' },
            ] as const).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setKind(o.v)}
                aria-pressed={kind === o.v}
                className={cn(
                  'flex-1 rounded-button px-2 py-2 text-[12px] font-bold transition-colors',
                  kind === o.v ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface text-[#7A6A58]',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          {kind === 'place' ? (
            bookmarks.length === 0 ? (
              <p className="rounded-card border border-dashed border-border py-4 text-center text-[12px] text-muted">
                보관함이 비어 있어요. ‘장소’ 탭에서 담거나, 빈 일정으로 추가해 투표로 정해보세요.
              </p>
            ) : (
              <Select
                label="장소 (보관함)"
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
                options={bookmarks.map((b) => ({ value: String(b.place.placeId), label: b.place.name }))}
              />
            )
          ) : (
            <Input
              label="일정 제목"
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 점심 먹을 곳 (투표로 정하기)"
            />
          )}
          <Input
            label="일자"
            type="date"
            value={date}
            min={period?.start}
            max={period?.end}
            onChange={(e) => setDate(e.target.value)}
          />
          <div>
            <span className="mb-1.5 block text-[13px] font-bold text-[#3A322B]">시간</span>
            <div className="flex items-center gap-2">
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              <span className="text-[#C0AE9B]">–</span>
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
          <Input
            label="예상 비용 (선택, 원)"
            type="number"
            inputMode="numeric"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0"
          />
        </div>
      )}
    </Modal>
  );
}
