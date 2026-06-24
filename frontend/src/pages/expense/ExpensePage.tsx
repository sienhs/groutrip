import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { ConfirmModal } from '../../components/Modal';
import { SkeletonCard } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import ExpenseFormModal from './ExpenseFormModal';
import SettlementPanel from './SettlementPanel';
import { getExpenses, getSettlement, deleteExpense } from '../../api/expense';
import { groupQueryKeys } from '../../queryKeys/groupQueryKeys';
import { expenseIcon, formatWon, type Expense } from '../../types/expense';
import type { GroupMember } from '../../types/group';
import useAuthStore from '../../store/authStore';

/**
 * 정산 — 총 지출/1인당, 지출 내역, 정산 요약(누가 누구에게) + 송금 딥링크.
 * members 는 그룹 허브에서 전달(결제자/분담 선택용). groupId 는 prop 또는 라우트.
 */
export default function ExpensePage({ groupId: groupIdProp, members = [] }: { groupId?: number; members?: GroupMember[] }) {
  const params = useParams<{ id: string }>();
  const groupId = groupIdProp ?? Number(params.id);
  const toast = useToast();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id ?? -1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 지출 내역 + 정산 요약을 한 키로 묶어 관리. EXPENSE_* SSE 이벤트가 이 키를 무효화한다.
  const expenseQuery = useQuery({
    queryKey: groupQueryKeys.expenses(groupId),
    queryFn: async () => {
      const [e, s] = await Promise.all([getExpenses(groupId), getSettlement(groupId)]);
      return { expenses: e, summary: s };
    },
    enabled: Number.isFinite(groupId),
  });
  const expenses = expenseQuery.data?.expenses ?? [];
  const summary = expenseQuery.data?.summary ?? null;
  const loading = expenseQuery.isLoading;
  const error = expenseQuery.isError;

  const invalidateExpenses = () =>
    queryClient.invalidateQueries({ queryKey: groupQueryKeys.expenses(groupId) });

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteExpense(groupId, deleting.id);
      toast.success('삭제했어요', deleting.description);
      setDeleting(null);
      invalidateExpenses();
    } catch {
      toast.error('삭제에 실패했어요', '권한이 없거나 일시적 오류일 수 있어요.');
    } finally {
      setDeleteLoading(false);
    }
  };

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
          action={<Button variant="secondary" onClick={() => expenseQuery.refetch()}>다시 시도</Button>}
        />
      )}

      {!loading && !error && (
        <div className="space-y-5">
          {/* 총 지출 */}
          <div className="rounded-card bg-gradient-to-br from-[#FF9F66] to-[#FF8A47] p-4 text-white">
            <p className="text-[12px] opacity-90">총 지출</p>
            <p className="mt-0.5 text-[25px] font-extrabold">{formatWon(summary?.totalExpenseAmount ?? 0)}</p>
            {summary && (
              <p className="mt-0.5 text-[12px] opacity-90">
                1인당 약 {formatWon(summary.averagePerMemberAmount)} · {summary.balances.length}명
              </p>
            )}
          </div>

          {/* 내역 */}
          <section>
            <h2 className="mb-2.5 text-[13px] font-extrabold tracking-wide text-muted">지출 내역</h2>
            {expenses.length === 0 ? (
              <EmptyState title="아직 지출이 없어요" description="+ 버튼으로 첫 지출을 추가해 보세요." />
            ) : (
              <div className="space-y-2.5">
                {expenses.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-card border border-border bg-surface px-3.5 py-3">
                    <span className="flex size-9 items-center justify-center rounded-[10px] bg-[#FFF1E6] text-[17px]">{expenseIcon(e.category)}</span>
                    <button type="button" onClick={() => { setEditing(e); setFormOpen(true); }} className="min-w-0 flex-1 text-left">
                      <div className="truncate text-[15px] font-bold">{e.description}</div>
                      <div className="text-[12px] text-muted">{e.payerName} 결제 · {e.splits.length}명 분담</div>
                      {e.memo && <div className="truncate text-[11px] text-[#A6907B]">{e.memo}</div>}
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

          {/* 정산 워크플로우 (시작/송금 딥링크/완료 확인) */}
          <SettlementPanel
            groupId={groupId}
            currentUserId={currentUserId}
            fallback={(summary?.transfers ?? []).map((t) => ({ fromName: t.fromName, toName: t.toName, amount: t.amount }))}
            onChanged={invalidateExpenses}
          />
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        aria-label="지출 추가"
        onClick={() => { setEditing(null); setFormOpen(true); }}
        className="fixed bottom-24 right-6 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors hover:bg-primary-hover"
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
        onSaved={() => invalidateExpenses()}
      />

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        danger
        title="지출을 삭제할까요?"
        description={deleting ? `'${deleting.description}'을(를) 삭제합니다.` : undefined}
        confirmText="삭제"
      />
    </div>
  );
}
