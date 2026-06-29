import { useEffect, useMemo, useRef, useState } from 'react';
import Modal, { ConfirmModal } from '../../components/Modal';
import Input from '../../components/Input';
import Button from '../../components/Button';
import DestinationAutocomplete from '../../components/DestinationAutocomplete';
import { useToast } from '../../components/Toast';
import { updateGroup, dissolveGroup, uploadGroupCover, groupCoverUrl } from '../../api/group';
import { isKnownRegion } from '../../lib/regions';
import { COVER_GRADIENT, COVER_LABEL, COVER_PRESETS } from './groupUi';
import { cn } from '../../lib/cn';
import type { CoverPreset, TravelGroup } from '../../types/group';

const PRESET_SET = new Set<string>(COVER_PRESETS);

interface Props {
  group: TravelGroup;
  onClose: () => void;
  onSaved: (updated: TravelGroup) => void;
  /** 그룹 삭제(해체) 후 호출 — 상위에서 목록으로 이동시킨다. */
  onDeleted: () => void;
}

/** FR-GROUP-04/06: 그룹 정보 수정 + 그룹 삭제(Owner). 제목/목적지/기간/커버. */
export default function GroupEditModal({ group, onClose, onSaved, onDeleted }: Props) {
  const toast = useToast();
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState(group.title);
  // 기존 목적지가 알려진 지역이면 자동완성 선택값으로, 아니면 자유 입력으로 둔다.
  const [destination, setDestination] = useState(isKnownRegion(group.destination) ? group.destination : '');
  const [freeDestination, setFreeDestination] = useState(isKnownRegion(group.destination) ? '' : group.destination);
  const [start, setStart] = useState(group.startDate);
  const [end, setEnd] = useState(group.endDate);
  // 기존 커버: 프리셋이면 그 값, 커스텀('CUSTOM')이면 프리셋 기본값으로 두고 keepCustom으로 유지한다.
  const [cover, setCover] = useState<CoverPreset>(
    PRESET_SET.has(group.coverImageKey) ? (group.coverImageKey as CoverPreset) : 'SUNSET',
  );
  // 새로 올린 파일(있으면 우선), 없고 keepCustom이면 기존 커스텀 이미지 유지.
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [keepCustom, setKeepCustom] = useState(group.coverImageKey === 'CUSTOM');
  const [saving, setSaving] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const newPreview = useMemo(() => (customFile ? URL.createObjectURL(customFile) : null), [customFile]);
  useEffect(() => () => {
    if (newPreview) URL.revokeObjectURL(newPreview);
  }, [newPreview]);

  // 미리보기에 쓸 커스텀 이미지 URL: 새 파일 > 기존 커스텀 유지 > 없음.
  const customPreviewUrl = newPreview ?? (keepCustom ? groupCoverUrl(group.id) : null);
  const isCustom = !!customFile || keepCustom;

  const onPickCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('이미지가 너무 커요', '5MB 이하 이미지를 올려주세요.');
      return;
    }
    setCustomFile(file);
    setKeepCustom(false);
  };

  // 로컬 기준 오늘/내일(YYYY-MM-DD). 여행이 이미 시작됐으면 시작일은 변경 불가(백엔드도 거부),
  // 종료일은 최소 내일(현재+1)부터 수정 가능.
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = ymd(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = ymd(tomorrowDate);
  const started = group.startDate <= today;
  const endMin = start > tomorrow ? start : tomorrow;

  const dest = destination || freeDestination.trim();
  const valid =
    title.trim().length > 0 && dest.length > 0 && !!start && !!end && start <= end && end >= endMin;

  // FR-GROUP-06: 그룹 해체(soft delete). 모든 멤버에게서 사라지고 30일 후 완전 삭제.
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await dissolveGroup(group.id);
      toast.info('그룹을 삭제했어요', '30일 후 완전 삭제됩니다.');
      setConfirmDel(false);
      onDeleted();
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error('삭제하지 못했어요', message ?? '권한이 없거나 일시적 오류일 수 있어요.');
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      let updated = await updateGroup(group.id, {
        title: title.trim(),
        destination: dest,
        startDate: start,
        endDate: end,
        // 새 파일이 있거나 기존 커스텀 유지면 CUSTOM, 아니면 선택한 프리셋.
        coverImageKey: isCustom ? 'CUSTOM' : cover,
      });
      // 새로 올린 파일이 있으면 멀티파트로 업로드(coverImageKey는 서버에서 CUSTOM 처리).
      if (customFile) {
        updated = await uploadGroupCover(group.id, customFile);
      }
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
    <>
    <Modal
      open
      onClose={() => !saving && !deleting && onClose()}
      title="그룹 정보 수정"
      footer={
        <>
          <Button variant="ghost" fullWidth className="border border-border" onClick={onClose} disabled={saving || deleting}>
            취소
          </Button>
          <Button fullWidth onClick={handleSave} loading={saving} disabled={!valid || deleting}>
            저장
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className={cn('relative flex h-20 items-end overflow-hidden rounded-card p-3', COVER_GRADIENT[cover])}>
          {customPreviewUrl && (
            <img
              src={customPreviewUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
            />
          )}
          <span className="relative text-[15px] font-extrabold text-white drop-shadow">{title.trim() || COVER_LABEL[cover]}</span>
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
          <span className="mb-1.5 block text-[13px] font-bold text-foreground">여행 기간</span>
          <div className="flex items-center gap-2">
            <Input type="date" value={start} disabled={started} onChange={(e) => setStart(e.target.value)} />
            <span className="text-[#B6B1C4]">–</span>
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
          <span className="mb-2 block text-[13px] font-bold text-foreground">
            커버 <span className="font-medium text-[#ABA6B8]">(프리셋 또는 직접 올리기)</span>
          </span>
          <div className="grid grid-cols-4 gap-2">
            {/* 직접 올리기 */}
            <button
              type="button"
              aria-label="커버 이미지 직접 올리기"
              aria-pressed={isCustom}
              onClick={() => coverInputRef.current?.click()}
              className={cn(
                'flex h-11 items-center justify-center overflow-hidden rounded-[10px] border border-dashed border-[#FFCFEB] bg-[#FAFAFF] text-[#C25478] transition-transform active:scale-95',
                isCustom && 'ring-2 ring-primary ring-offset-2 ring-offset-surface',
              )}
            >
              {customPreviewUrl ? (
                <img src={customPreviewUrl} alt="" className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              )}
            </button>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={onPickCover} />

            {COVER_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={COVER_LABEL[c]}
                aria-pressed={!isCustom && cover === c}
                onClick={() => { setCustomFile(null); setKeepCustom(false); setCover(c); }}
                className={cn(
                  'h-11 rounded-[10px] transition-transform active:scale-95',
                  COVER_GRADIENT[c],
                  !isCustom && cover === c && 'ring-2 ring-primary ring-offset-2 ring-offset-surface',
                )}
              />
            ))}
          </div>
          {isCustom && (
            <button
              type="button"
              onClick={() => { setCustomFile(null); setKeepCustom(false); }}
              className="mt-1.5 text-[12px] font-semibold text-[#9A95A8]"
            >
              직접 올린 이미지 취소(프리셋 사용)
            </button>
          )}
        </div>

        {/* 위험 구역 — 그룹 삭제(Owner, FR-GROUP-06) */}
        <div className="border-t border-[#EFEDF7] pt-3">
          <p className="mb-2 text-[12px] font-extrabold tracking-wide text-[#B6B1C4]">위험 구역</p>
          <Button variant="danger" fullWidth onClick={() => setConfirmDel(true)} disabled={saving || deleting}>
            그룹 삭제
          </Button>
          <p className="mt-1.5 text-[12px] text-muted">
            삭제하면 모든 멤버에게서 그룹이 사라지고 30일 후 완전 삭제돼요.
          </p>
        </div>
      </div>
    </Modal>

    <ConfirmModal
      open={confirmDel}
      onClose={() => !deleting && setConfirmDel(false)}
      onConfirm={handleDelete}
      loading={deleting}
      danger
      title="그룹을 삭제할까요?"
      description="모든 멤버에게서 그룹이 사라지며 30일 후 완전 삭제됩니다. 되돌릴 수 없어요."
      confirmText="삭제"
    />
    </>
  );
}
