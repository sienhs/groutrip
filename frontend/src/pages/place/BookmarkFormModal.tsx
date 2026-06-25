import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Select from '../../components/Select';
import { useToast } from '../../components/Toast';
import { addBookmark, updateBookmark } from '../../api/place';
import {
  PLACE_CATEGORIES,
  type BookmarkResponse,
  type PlaceCategory,
  type PlaceSearchResult,
} from '../../types/place';

type Mode =
  | { mode: 'create'; place: PlaceSearchResult }
  | { mode: 'edit'; bookmark: BookmarkResponse };

type Props = {
  open: boolean;
  groupId: number;
  onClose: () => void;
  /** 성공 시(추가/수정된 항목 반환) — 목록 갱신/추가표시에 사용 */
  onSaved: (result: BookmarkResponse) => void;
} & Mode;

const MEMO_MAX = 500;

/**
 * 보관함 추가/수정 공용 모달.
 * - create: 검색 결과(place)를 받아 googlePlaceId 로 추가. categoryTag 기본값 = place.category.
 * - edit: 기존 bookmark 의 태그/메모/평점 수정.
 */
export default function BookmarkFormModal(props: Props) {
  const { open, groupId, onClose, onSaved } = props;
  const toast = useToast();

  const initialTag: PlaceCategory =
    props.mode === 'create' ? props.place.category : props.bookmark.categoryTag;
  const initialMemo = props.mode === 'edit' ? (props.bookmark.memo ?? '') : '';

  const placeName = props.mode === 'create' ? props.place.name : props.bookmark.place.name;

  const [categoryTag, setCategoryTag] = useState<PlaceCategory>(initialTag);
  const [memo, setMemo] = useState(initialMemo);
  const [submitting, setSubmitting] = useState(false);

  // 모달이 새로 열릴 때 대상이 바뀌면 폼 초기화
  useEffect(() => {
    if (!open) return;
    setCategoryTag(initialTag);
    setMemo(initialMemo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const body = {
        categoryTag,
        memo: memo.trim() ? memo.trim() : undefined,
      };
      const saved =
        props.mode === 'create'
          ? await addBookmark(groupId, { googlePlaceId: props.place.googlePlaceId, ...body })
          : await updateBookmark(groupId, props.bookmark.id, body);
      toast.success(props.mode === 'create' ? '보관함에 추가했어요' : '수정했어요', placeName);
      onSaved(saved);
      onClose();
    } catch {
      toast.error('저장에 실패했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={props.mode === 'create' ? '보관함에 추가' : '보관함 수정'}
      dismissable={!submitting}
      footer={
        <>
          <Button variant="ghost" fullWidth onClick={onClose} className="border border-border" disabled={submitting}>
            취소
          </Button>
          <Button variant="primary" fullWidth loading={submitting} onClick={handleSubmit}>
            {props.mode === 'create' ? '추가하기' : '저장'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="truncate rounded-button bg-background px-3 py-2.5 text-[14px] font-bold text-foreground">
          {placeName}
        </p>

        <Select
          label="태그"
          value={categoryTag}
          onChange={(e) => setCategoryTag(e.target.value as PlaceCategory)}
          options={PLACE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
        />

        <div>
          <label htmlFor="bookmark-memo" className="mb-1.5 block text-[13px] font-bold text-foreground">
            메모
          </label>
          <textarea
            id="bookmark-memo"
            value={memo}
            maxLength={MEMO_MAX}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 오션뷰 자리 미리 예약하기"
            rows={3}
            className="w-full resize-none rounded-button border border-border bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-[#C0AE9B] focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1 text-right text-[11px] text-muted">
            {memo.length}/{MEMO_MAX}
          </p>
        </div>
      </div>
    </Modal>
  );
}
