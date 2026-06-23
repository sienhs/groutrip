import { useState } from 'react';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Button from '../../components/Button';
import DestinationAutocomplete from '../../components/DestinationAutocomplete';
import { useToast } from '../../components/Toast';
import { updateGroup } from '../../api/group';
import { isKnownRegion } from '../../lib/regions';
import { COVER_GRADIENT, COVER_LABEL, COVER_PRESETS } from './groupUi';
import { cn } from '../../lib/cn';
import type { CoverPreset, TravelGroup } from '../../types/group';

interface Props {
  group: TravelGroup;
  onClose: () => void;
  onSaved: (updated: TravelGroup) => void;
}

/** FR-GROUP-04: 그룹 정보 수정(Owner). 제목/목적지/기간/커버. */
export default function GroupEditModal({ group, onClose, onSaved }: Props) {
  const toast = useToast();
  const [title, setTitle] = useState(group.title);
  // 기존 목적지가 알려진 지역이면 자동완성 선택값으로, 아니면 자유 입력으로 둔다.
  const [destination, setDestination] = useState(isKnownRegion(group.destination) ? group.destination : '');
  const [freeDestination, setFreeDestination] = useState(isKnownRegion(group.destination) ? '' : group.destination);
  const [start, setStart] = useState(group.startDate);
  const [end, setEnd] = useState(group.endDate);
  const [cover, setCover] = useState<CoverPreset>((group.coverImageKey as CoverPreset) ?? 'SUNSET');
  const [saving, setSaving] = useState(false);

  // 로컬 기준 오늘/내일(YYYY-MM-DD). 여행이 이미 시작됐으면 시작일은 변경 불가(백엔드도 거부),
  // 종료일은 최소 내일(현재+1)부터 수정 가능.
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = ymd(new Date());
  const tomorrow = ymd(new Date(Date.now() + 86400000));
  const started = group.startDate <= today;
  const endMin = start > tomorrow ? start : tomorrow;

  const dest = destination || freeDestination.trim();
  const valid =
    title.trim().length > 0 && dest.length > 0 && !!start && !!end && start <= end && end >= endMin;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const updated = await updateGroup(group.id, {
        title: title.trim(),
        destination: dest,
        startDate: start,
        endDate: end,
        coverImageKey: cover,
      });
      toast.success('그룹 정보를 수정했어요', updated.title);
      onSaved(updated);
      onClose();
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error('수정하지 못했어요', message ?? '권한이 없거나 입력값을 확인해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => !saving && onClose()}
      title="그룹 정보 수정"
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
      <div className="space-y-4">
        <div className={cn('flex h-20 items-end rounded-card p-3', COVER_GRADIENT[cover])}>
          <span className="text-[15px] font-extrabold text-white drop-shadow">{title.trim() || COVER_LABEL[cover]}</span>
        </div>

        <Input label="그룹 이름" value={title} maxLength={30} onChange={(e) => setTitle(e.target.value)} />

        <DestinationAutocomplete
          label="목적지"
          value={destination}
          onChange={(v) => {
            setDestination(v);
            if (v) setFreeDestination('');
          }}
          placeholder="지역명을 입력하세요 (예: 용인, 제주)"
          helper={
            freeDestination
              ? `현재: ${freeDestination} · 목록에서 다시 선택하면 추천이 정확해져요`
              : '목록에서 지역을 선택하면 목적지별 추천이 정확해져요.'
          }
        />

        <div>
          <span className="mb-1.5 block text-[13px] font-bold text-[#3A322B]">여행 기간</span>
          <div className="flex items-center gap-2">
            <Input type="date" value={start} disabled={started} onChange={(e) => setStart(e.target.value)} />
            <span className="text-[#C0AE9B]">–</span>
            <Input type="date" value={end} min={endMin} onChange={(e) => setEnd(e.target.value)} />
          </div>
          {started && (
            <p className="mt-1.5 text-[12px] text-muted">여행이 시작돼 시작일은 변경할 수 없어요. 종료일만 조정할 수 있어요.</p>
          )}
          {start && end && start > end && (
            <p className="mt-1.5 text-[12px] text-danger">종료일이 시작일보다 빠를 수 없어요.</p>
          )}
          {end && end < endMin && (
            <p className="mt-1.5 text-[12px] text-danger">종료일은 {endMin.slice(5).replace('-', '.')} 이후여야 해요.</p>
          )}
        </div>

        <div>
          <span className="mb-2 block text-[13px] font-bold text-[#3A322B]">커버</span>
          <div className="grid grid-cols-4 gap-2">
            {COVER_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={COVER_LABEL[c]}
                aria-pressed={cover === c}
                onClick={() => setCover(c)}
                className={cn(
                  'h-11 rounded-[10px] transition-transform active:scale-95',
                  COVER_GRADIENT[c],
                  cover === c && 'ring-2 ring-primary ring-offset-2 ring-offset-surface',
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
