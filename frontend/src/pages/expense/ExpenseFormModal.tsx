import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Select from '../../components/Select';
import MultiSelect from '../../components/MultiSelect';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';
import { addExpense, updateExpense } from '../../api/expense';
import { EXPENSE_CATEGORIES, type Expense } from '../../types/expense';
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
  const editing = !!expense;

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(expense?.title ?? '');
    setAmount(expense ? String(expense.amount) : '');
    setPayerId(expense ? String(expense.payerId) : String(members[0]?.userId ?? ''));
    setParticipants((expense?.participantIds ?? members.map((m) => m.userId)).map(String));
    setCategory(expense?.category ?? EXPENSE_CATEGORIES[0]);
  }, [open, expense, members]);

  const amountNum = Number(amount);
  const valid = title.trim().length > 0 && amountNum > 0 && payerId !== '' && participants.length > 0;

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);
    const body = {
      title: title.trim(),
      amount: amountNum,
      payerId: Number(payerId),
      participantIds: participants.map(Number),
      category,
    };
    try {
      const saved = editing
        ? await updateExpense(groupId, expense!.id, body)
        : await addExpense(groupId, body);
      toast.success(editing ? '지출을 수정했어요' : '지출을 추가했어요', saved.title);
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
          onChange={(e) => setCategory(e.target.value)}
          options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
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
