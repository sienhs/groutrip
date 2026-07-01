import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Select from '../../components/Select';
import MultiSelect from '../../components/MultiSelect';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';
import { addExpense, updateExpense } from '../../api/expense';
import { groupQueryKeys } from '../../queryKeys/groupQueryKeys';
import { appQueryKeys } from '../../queryKeys/appQueryKeys';
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory } from '../../types/expense';
import type { GroupMember } from '../../types/group';

interface Props {
  open: boolean;
  groupId: number;
  members: GroupMember[];
  expense?: Expense | null; // 있으면 수정 모드
  onClose: () => void;
  onSaved: (e: Expense) => void;
}

/** 지출 추가/수정 모달 — 금액/항목/결제자/분담 대상/카테고리. */
export default function ExpenseFormModal({ open, groupId, members, expense, onClose, onSaved }: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const editing = !!expense;

  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [category, setCategory] = useState<ExpenseCategory>('MEAL');

  useEffect(() => {
    if (!open) return;
    setTitle(expense?.description ?? '');
    setMemo(expense?.memo ?? '');
    setAmount(expense ? String(expense.amount) : '');
    setPayerId(expense ? String(expense.payerId) : String(members[0]?.userId ?? ''));
    // 강퇴된(비활성) 멤버는 분담 대상에서 제외한다. 예전 지출의 splits에 남아 있어도 다시 전송하지 않아
    // "활성 멤버가 아님" 검증 크래시를 막고, 저장 시 남은 인원으로 재분담되도록 한다.
    const activeIds = new Set(members.map((m) => m.userId));
    setParticipants(
      (expense
        ? expense.splits.map((s) => s.userId).filter((id) => activeIds.has(id))
        : members.map((m) => m.userId)
      ).map(String),
    );
    setCategory(expense?.category ?? 'MEAL');
  }, [open, expense, members]);

  const amountNum = Number(amount);
  const valid = title.trim().length > 0 && amountNum > 0 && payerId !== '' && participants.length > 0;

  const saveMutation = useMutation({
    // 백엔드 ExpenseCreateRequest: EQUAL 분담(participantIds), description, paidAt(결제일).
    mutationFn: () => {
      const body = {
        amount: amountNum,
        payerId: Number(payerId),
        category,
        splitType: 'EQUAL' as const,
        description: title.trim(),
        memo: memo.trim() || undefined,
        paidAt: expense?.paidAt ?? new Date().toISOString().slice(0, 10),
        participantIds: participants.map(Number),
      };
      return editing ? updateExpense(groupId, expense!.id, body) : addExpense(groupId, body);
    },
    onSuccess: (saved) => {
      // 지출/정산 요약 + 홈 미정산 배지를 갱신.
      queryClient.invalidateQueries({ queryKey: groupQueryKeys.expenses(groupId) });
      queryClient.invalidateQueries({ queryKey: appQueryKeys.home() });
      toast.success(editing ? '지출을 수정했어요' : '지출을 추가했어요', saved.description);
      onSaved(saved);
      onClose();
    },
    onError: () => toast.error('저장에 실패했어요', '잠시 후 다시 시도해 주세요.'),
  });
  const submitting = saveMutation.isPending;
  const handleSubmit = () => { if (valid) saveMutation.mutate(); };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? '지출 수정' : '지출 추가'}
      dismissable={!submitting}
      footer={
        <>
          <Button variant="ghost" fullWidth className="border border-border" disabled={submitting} onClick={onClose}>
            취소
          </Button>
          <Button fullWidth loading={submitting} disabled={!valid} onClick={handleSubmit}>
            {editing ? '저장' : '추가'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="항목" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} placeholder="예: 흑돼지 저녁" />
        <Input
          label="메모 (선택)"
          value={memo}
          maxLength={255}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="예: 1인 2만원씩, 카드 결제"
        />
        <Input
          label="금액"
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          trailing={<span className="text-[13px] font-bold">원</span>}
        />
        <Select
          label="결제자"
          value={payerId}
          onChange={(e) => setPayerId(e.target.value)}
          options={members.map((m) => ({ value: String(m.userId), label: m.name }))}
        />
        <Select
          label="카테고리"
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          options={EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
        />
        <MultiSelect
          label="분담 대상"
          value={participants}
          onChange={setParticipants}
          options={members.map((m) => ({ value: String(m.userId), label: m.name }))}
          error={participants.length === 0 ? '한 명 이상 선택하세요.' : undefined}
        />
      </div>
    </Modal>
  );
}
