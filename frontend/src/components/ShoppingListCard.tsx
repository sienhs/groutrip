import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addShoppingItem, deleteShoppingItem, getShoppingItems, toggleShoppingItem } from '../api/shopping';
import { groupQueryKeys } from '../queryKeys/groupQueryKeys';
import { cn } from '../lib/cn';
import type { ShoppingItem } from '../types/shopping';

interface Props {
  groupId: number;
  currentUserId: number;
  isOwner: boolean;
}

export default function ShoppingListCard({ groupId, currentUserId, isOwner }: Props) {
  const queryClient = useQueryClient();
  const queryKey = groupQueryKeys.shoppingItems(groupId);

  const { data: items = [] } = useQuery({
    queryKey,
    queryFn: () => getShoppingItems(groupId),
  });

  const [open, setOpen] = useState(false);
  const autoOpened = useRef(false);

  // 데이터 로드 후 항목이 있으면 최초 1회만 자동으로 펼친다.
  useEffect(() => {
    if (!autoOpened.current && items.length > 0) {
      autoOpened.current = true;
      setOpen(true);
    }
  }, [items.length]);

  const [nameInput, setNameInput] = useState('');
  const [qtyInput, setQtyInput] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const addMutation = useMutation({
    mutationFn: () => addShoppingItem(groupId, nameInput.trim(), qtyInput.trim() || undefined),
    onSuccess: () => {
      setNameInput('');
      setQtyInput('');
      invalidate();
      nameRef.current?.focus();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (itemId: number) => toggleShoppingItem(groupId, itemId),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: number) => deleteShoppingItem(groupId, itemId),
    onSuccess: invalidate,
  });

  const unchecked = items.filter((i: ShoppingItem) => !i.checked);
  const checked = items.filter((i: ShoppingItem) => i.checked);
  const totalCount = items.length;
  const checkedCount = checked.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    addMutation.mutate();
  };

  const canDelete = (item: ShoppingItem) => item.addedById === currentUserId || isOwner;

  return (
    <div className="mx-4 mb-3 overflow-hidden rounded-card border border-border bg-surface">
      {/* 헤더 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[#FFF0E6]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="#FF9F66" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M3 6h18" stroke="#FF9F66" strokeWidth="1.8" />
            <path d="M16 10a4 4 0 0 1-8 0" stroke="#FF9F66" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-extrabold text-foreground">장보기 목록</span>
            {totalCount > 0 && (
              <span className="rounded-full bg-[#FF9F66]/15 px-2 py-0.5 text-[11px] font-bold text-[#E07830]">
                {checkedCount}/{totalCount}
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-muted">
            {totalCount === 0 ? '장볼 항목을 추가해 보세요' : `${unchecked.length}개 남음`}
          </p>
        </div>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* 펼쳐진 내용 */}
      {open && (
        <div className="border-t border-border">
          {/* 미완료 항목 */}
          {unchecked.length === 0 && checked.length === 0 && (
            <p className="px-4 py-5 text-center text-[13px] text-muted">아직 추가된 항목이 없어요</p>
          )}

          {unchecked.map((item: ShoppingItem) => (
            <ItemRow
              key={item.id}
              item={item}
              canDelete={canDelete(item)}
              onToggle={() => toggleMutation.mutate(item.id)}
              onDelete={() => deleteMutation.mutate(item.id)}
            />
          ))}

          {/* 완료 항목 구분선 */}
          {checked.length > 0 && unchecked.length > 0 && (
            <div className="mx-4 my-1 border-t border-dashed border-border" />
          )}

          {checked.map((item: ShoppingItem) => (
            <ItemRow
              key={item.id}
              item={item}
              canDelete={canDelete(item)}
              onToggle={() => toggleMutation.mutate(item.id)}
              onDelete={() => deleteMutation.mutate(item.id)}
            />
          ))}

          {/* 추가 폼 */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border px-3 py-2.5">
            <input
              ref={nameRef}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="항목 추가"
              maxLength={100}
              className="min-w-0 flex-1 rounded-button border border-border bg-background px-3 py-1.5 text-[13px] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#FF9F66]/40"
            />
            <input
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              placeholder="수량"
              maxLength={50}
              className="w-16 shrink-0 rounded-button border border-border bg-background px-2 py-1.5 text-[13px] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#FF9F66]/40"
            />
            <button
              type="submit"
              disabled={!nameInput.trim() || addMutation.isPending}
              className="shrink-0 rounded-button bg-[#FF9F66] px-3 py-1.5 text-[13px] font-bold text-white disabled:opacity-40"
            >
              추가
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

interface ItemRowProps {
  item: ShoppingItem;
  canDelete: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

function ItemRow({ item, canDelete, onToggle, onDelete }: ItemRowProps) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-2.5', item.checked && 'opacity-50')}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={item.checked ? '체크 해제' : '체크'}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          item.checked
            ? 'border-[#FF9F66] bg-[#FF9F66]'
            : 'border-border bg-background',
        )}
      >
        {item.checked && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <span className={cn('flex-1 text-[13.5px] text-foreground', item.checked && 'line-through')}>
        {item.name}
        {item.quantity && (
          <span className="ml-1.5 text-[12px] text-muted">{item.quantity}</span>
        )}
      </span>

      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="삭제"
          className="shrink-0 rounded p-1 text-muted hover:text-danger"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
