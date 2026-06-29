import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
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

const PIE_COLORS = ['#C25478', '#E86A92', '#A0C4FF', '#9BF6FF', '#CAFFBF', '#FFD6A5', '#FDFFB6', '#BDB2FF'];

function buildPayerData(expenses: Expense[]) {
  const map = new Map<string, number>();
  for (const e of expenses) {
    map.set(e.payerName, (map.get(e.payerName) ?? 0) + e.amount);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

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
  const isOwner = members.find((m) => m.userId === currentUserId)?.role === 'OWNER';

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 지출이 많아질 때 한 번에 전부 그리지 않도록 "더보기"로 점진 렌더(보관함과 동일 패턴).
  const PAGE_SIZE = 8;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
          <div className="rounded-card bg-gradient-to-br from-[#E86A92] to-[#D9577F] p-4 text-white">
            <p className="text-[12px] opacity-90">총 지출</p>
            <p className="mt-0.5 text-[25px] font-extrabold">{formatWon(summary?.totalExpenseAmount ?? 0)}</p>
            {summary && (
              <p className="mt-0.5 text-[12px] opacity-90">
                1인당 약 {formatWon(summary.averagePerMemberAmount)} · {summary.balances.length}명
              </p>
            )}
          </div>

          {/* 멤버별 지출 파이차트 */}
          {expenses.length > 0 && (() => {
            const data = buildPayerData(expenses);
            return (
              <section>
                <h2 className="mb-2.5 text-[13px] font-extrabold tracking-wide text-muted">멤버별 지출</h2>
                <div className="rounded-card border border-border bg-surface p-4">
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={110} height={110}>
                      <PieChart>
                        <Pie
                          data={data}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={28}
                          outerRadius={50}
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {data.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => formatWon(v as number)}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8E4F0' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <ul className="min-w-0 flex-1 space-y-1.5">
                      {data.map((d, i) => (
                        <li key={d.name} className="flex items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{d.name}</span>
                          <span className="shrink-0 text-[13px] font-extrabold text-foreground">{formatWon(d.value)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* 내역 */}
          <section>
            <h2 className="mb-2.5 text-[13px] font-extrabold tracking-wide text-muted">지출 내역</h2>
            {expenses.length === 0 ? (
              <EmptyState title="아직 지출이 없어요" description="지출을 기록하면 여행 후 자동으로 1/N 정산해드려요." />
            ) : (
              <div className="space-y-2.5">
                {expenses.slice(0, visibleCount).map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-card border border-border bg-surface px-3.5 py-3">
                    <span className="flex size-9 items-center justify-center rounded-[10px] bg-[#FCF0F9] text-[17px]">{expenseIcon(e.category)}</span>
                    <button type="button" onClick={() => { setEditing(e); setFormOpen(true); }} className="min-w-0 flex-1 text-left">
                      <div className="truncate text-[15px] font-bold">{e.description}</div>
                      <div className="text-[12px] text-muted">{e.payerName} 결제 · {e.splits.length}명 분담</div>
                      {e.memo && <div className="truncate text-[11px] text-[#9A95A8]">{e.memo}</div>}
                    </button>
                    <span className="text-[15px] font-extrabold">{formatWon(e.amount)}</span>
                    <button
                      type="button"
                      aria-label="수정"
                      onClick={() => { setEditing(e); setFormOpen(true); }}
                      className="flex size-8 items-center justify-center rounded-button text-[#8A8699] hover:bg-[#FCF0F9] hover:text-[#C25478]"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M4 20h4L18 10l-4-4L4 16v4ZM14 6l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="삭제"
                      onClick={() => setDeleting(e)}
                      className="flex size-8 items-center justify-center rounded-button text-[#8A8699] hover:bg-[#FEE2E2] hover:text-danger"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ))}
                {expenses.length > visibleCount && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                    className="w-full rounded-card border border-border bg-surface py-2.5 text-[13px] font-bold text-muted active:bg-background"
                  >
                    더보기 ({expenses.length - visibleCount}개 더)
                  </button>
                )}
              </div>
            )}
          </section>

          {/* 미정산 리마인더 — 지출이 있고 아직 정산 내역이 남아 있을 때 */}
          {expenses.length > 0 && (summary?.balances?.length ?? 0) > 0 && (
            <div className="flex items-center gap-3 rounded-card border border-[#FFCFEB] bg-[#FFF0F7] px-3.5 py-3">
              <span className="text-[20px]">💸</span>
              <p className="min-w-0 flex-1 text-[12.5px] font-semibold leading-snug text-[#AD5575]">
                정산이 필요한 내역이 있어요. 아래에서 정산을 시작해 보세요.
              </p>
            </div>
          )}

          {/* 정산 워크플로우 (시작/송금 딥링크/완료 확인) */}
          <SettlementPanel
            groupId={groupId}
            currentUserId={currentUserId}
            isOwner={isOwner}
            expenses={expenses}
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
