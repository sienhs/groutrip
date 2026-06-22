import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { ConfirmModal } from '../../components/Modal';
import { SkeletonCard } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import ExpenseFormModal from './ExpenseFormModal';
import { getExpenses, getExpenseSummary, deleteExpense } from '../../api/expense';
import { expenseIcon, formatWon, type Expense, type ExpenseSummary } from '../../types/expense';
import type { GroupMember } from '../../types/group';

/**
 * 정산 — 총 지출/1인당, 지출 내역, 정산 요약(누가 누구에게) + 송금 딥링크.
 * members 는 그룹 허브에서 전달(결제자/분담 선택용). groupId 는 prop 또는 라우트.
 */
export default function ExpensePage({ groupId: groupIdProp, members = [] }: { groupId?: number; members?: GroupMember[] }) {
  const params = useParams<{ id: string }>();
  const groupId = groupIdProp ?? Number(params.id);
  const toast = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [e, s] = await Promise.all([getExpenses(groupId), getExpenseSummary(groupId)]);
      setExpenses(e);
      setSummary(s);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteExpense(groupId, deleting.id);
      toast.success('삭제했어요', deleting.title);
      setDeleting(null);
      load();
    } catch {
      toast.error('삭제에 실패했어요', '권한이 없거나 일시적 오류일 수 있어요.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const payLink = (s: string) => toast.info(s, `${s} 송금 화면으로 이동합니다(딥링크).`);

  return (
    <div className="relative min-h-[60vh]">
      {loading && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && error && (
        <EmptyState
          title="정산을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={<Button variant="secondary" onClick={load}>다시 시도</Button>}
        />
      )}

      {!loading && !error && (
        <div className="space-y-5">
          {/* 총 지출 */}
          <div className="rounded-card bg-gradient-to-br from-[#FF9F66] to-[#FF8A47] p-4 text-white">
            <p className="text-[12px] opacity-90">총 지출</p>
            <p className="mt-0.5 text-[25px] font-extrabold">{formatWon(summary?.total ?? 0)}</p>
            {summary && (
              <p className="mt-0.5 text-[12px] opacity-90">
                1인당 약 {formatWon(summary.perPerson)} · {summary.memberCount}명
              </p>
            )}
          </div>

          {/* 내역 */}
          <section>
            <h2 className="mb-2.5 text-[13px] font-extrabold tracking-wide text-[#BCA48C]">지출 내역</h2>
            {expenses.length === 0 ? (
              <EmptyState title="아직 지출이 없어요" description="+ 버튼으로 첫 지출을 추가해 보세요." />
            ) : (
              <div className="space-y-2.5">
                {expenses.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-card border border-border bg-surface px-3.5 py-3">
                    <span className="flex size-9 items-center justify-center rounded-[10px] bg-[#FFF1E6] text-[17px]">{expenseIcon(e.category)}</span>
                    <button type="button" onClick={() => { setEditing(e); setFormOpen(true); }} className="min-w-0 flex-1 text-left">
                      <div className="truncate text-[15px] font-bold">{e.title}</div>
                      <div className="text-[12px] text-muted">{e.payerName} 결제 · {e.participantIds.length}명 분담</div>
                    </button>
                    <span className="text-[15px] font-extrabold">{formatWon(e.amount)}</span>
                    <button
                      type="button"
                      aria-label="삭제"
                      onClick={() => setDeleting(e)}
                      className="flex size-8 items-center justify-center rounded-button text-[#8A7B6B] hover:bg-[#FEE2E2] hover:text-danger"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 정산 요약 */}
          {summary && summary.settlements.length > 0 && (
            <section>
              <h2 className="mb-2.5 text-[13px] font-extrabold tracking-wide text-[#BCA48C]">정산 요약</h2>
              <div className="space-y-2.5">
                {summary.settlements.map((s, i) => (
                  <div key={i} className="rounded-card border border-border bg-surface p-3.5">
                    <div className="flex items-center gap-2 text-[14px] font-bold">
                      <span>{s.fromName}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M5 12h14M13 6l6 6-6 6" stroke="#A6907B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{s.toName}</span>
                      <span className="ml-auto font-extrabold text-[#E8742E]">{formatWon(s.amount)}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => payLink('토스')} className="flex-1 rounded-button bg-[#3182F6] py-2.5 text-[13px] font-extrabold text-white">토스로 송금</button>
                      <button type="button" onClick={() => payLink('카카오페이')} className="flex-1 rounded-button bg-[#FEE500] py-2.5 text-[13px] font-extrabold text-[#3C1E1E]">카카오페이</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        aria-label="지출 추가"
        onClick={() => { setEditing(null); setFormOpen(true); }}
        className="fixed bottom-6 right-6 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors hover:bg-primary-hover"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>

      <ExpenseFormModal
        open={formOpen}
        groupId={groupId}
        members={members}
        expense={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => load()}
      />

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        danger
        title="지출을 삭제할까요?"
        description={deleting ? `'${deleting.title}'을(를) 삭제합니다.` : undefined}
        confirmText="삭제"
      />
    </div>
  );
}
